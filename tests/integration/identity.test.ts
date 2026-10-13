import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID, createHmac } from "node:crypto";
import { migrate } from "../../scripts/migrate.mjs";
import { createIdentity, type AuthMail } from "../../src/modules/identity/auth";
import { createTenancy } from "../../src/modules/tenancy/service";
import { assertRuntimeRole } from "../../src/modules/identity/database-role";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "TEST_DATABASE_URL must point to an isolated database ending in _test.",
  );
const pool = new Pool({ connectionString: url, max: 3 });
const mail: AuthMail[] = [];
const base = "http://127.0.0.1:3000";
const auth = createIdentity(pool, {
  url: base,
  secret: "integration-fixture-only-never-use-in-production",
  secure: false,
  sendMail: async (value) => {
    mail.push(value);
  },
});
const tenancy = createTenancy(pool, auth);

class Client {
  cookies = new Map<string, string>();
  ip = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
  get headers() {
    return new Headers({
      cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      origin: base,
      "x-forwarded-for": this.ip,
    });
  }
  async request(path: string, body?: unknown, origin = base) {
    const response = await auth.handler(
      new Request(`${base}/api/auth${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...Object.fromEntries(this.headers),
          origin,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const item of response.headers.getSetCookie()) {
      const part = item.split(";")[0]!;
      const at = part.indexOf("=");
      this.cookies.set(part.slice(0, at), part.slice(at + 1));
    }
    const data = await response.json();
    return { status: response.status, data };
  }
}
const password = "Synthetic-test-account-password!";
async function account(name: string, mfa = true) {
  const client = new Client(),
    email = `${name}-${randomUUID()}@example.test`.toLowerCase();
  expect(
    (await client.request("/sign-up/email", { name, email, password })).status,
  ).toBe(200);
  const verification = mail.findLast((v) => v.to === email)!;
  expect(verification).toBeDefined();
  const response = await auth.handler(new Request(verification.url));
  expect([200, 302]).toContain(response.status);
  expect(
    (await client.request("/sign-in/email", { email, password })).status,
  ).toBe(200);
  if (mfa) {
    const enabled = await client.request("/two-factor/enable", { password });
    expect(enabled.status).toBe(200);
    const secret = new URL(enabled.data.totpURI).searchParams.get("secret")!;
    expect(
      (await client.request("/two-factor/verify-totp", { code: totp(secret) }))
        .status,
    ).toBe(200);
  }
  return { client, email };
}
function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", bytes).update(counter).digest(),
    offset = hash[hash.length - 1]! & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}

beforeAll(async () => {
  const role = (
    await pool.query(
      "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    )
  ).rows[0];
  expect(role).toEqual({ rolsuper: false, rolbypassrls: false });
  const ownerUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  if (!ownerUrl || new URL(ownerUrl).pathname !== new URL(url!).pathname)
    throw new Error(
      "TEST_MIGRATION_DATABASE_URL must target the same isolated test database with a separate owner.",
    );
  const owner = new Pool({ connectionString: ownerUrl });
  try {
    await migrate(owner);
    await owner.query(
      await import("node:fs/promises").then((fs) =>
        fs.readFile("scripts/grant-runtime.sql", "utf8"),
      ),
    );
  } finally {
    await owner.end();
  }
  await assertRuntimeRole(pool);
}, 30000);
afterAll(async () => {
  await pool.end();
});

describe("real PostgreSQL identity and tenant boundary", () => {
  it("runtime cannot own tables, adopt the migration role or disable RLS", async () => {
    const ownerName = decodeURIComponent(
      new URL(process.env.TEST_MIGRATION_DATABASE_URL!).username,
    );
    await expect(
      pool.query(`SET ROLE "${ownerName.replaceAll('"', '""')}"`),
    ).rejects.toThrow();
    const owner = new Pool({
      connectionString: process.env.TEST_MIGRATION_DATABASE_URL,
    });
    try {
      await expect(assertRuntimeRole(owner)).rejects.toThrow(
        "IDENTITY_DB_ROLE_UNSAFE",
      );
    } finally {
      await owner.end();
    }
    await expect(
      pool.query("ALTER TABLE organization DISABLE ROW LEVEL SECURITY"),
    ).rejects.toThrow();
    expect(
      (
        await pool.query(
          "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname='organization'",
        )
      ).rows[0],
    ).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  });
  it("requires verified email and rejects forged session claims and hostile origins", async () => {
    const c = new Client(),
      email = `unverified-${randomUUID()}@example.test`;
    await c.request("/sign-up/email", {
      name: "Unverified",
      email,
      password,
      mfaVerifiedAt: new Date(),
      activeOrganizationId: randomUUID(),
    });
    expect(
      (await c.request("/sign-in/email", { email, password })).status,
    ).toBe(403);
    expect(
      (
        await c.request(
          "/sign-in/email",
          { email, password },
          "https://hostile.example",
        )
      ).status,
    ).toBe(403);
    await expect(
      tenancy.list(new Headers({ cookie: "better-auth.session_token=forged" })),
    ).rejects.toMatchObject({ code: "SIGN_IN_REQUIRED" });
  });
  it("enforces MFA proof on the current session before organization creation", async () => {
    const { client } = await account("NoMfa", false);
    await expect(
      tenancy.create(client.headers, { name: "School", kind: "school" }),
    ).rejects.toMatchObject({ code: "MFA_REQUIRED" });
  });
  it("never upgrades an old first-factor session when another session enrolls MFA", async () => {
    const owner = await account("Enrollment", false),
      old = new Client();
    expect(
      (
        await old.request("/sign-in/email", {
          email: owner.email,
          password,
          mfaVerifiedAt: new Date(),
          activeOrganizationId: randomUUID(),
        })
      ).status,
    ).toBe(200);
    const enabled = await owner.client.request("/two-factor/enable", {
      password,
    });
    const secret = new URL(enabled.data.totpURI).searchParams.get("secret")!;
    expect(
      (
        await owner.client.request("/two-factor/verify-totp", {
          code: totp(secret),
        })
      ).status,
    ).toBe(200);
    const org = await tenancy.create(owner.client.headers, {
      name: "Enrollment school",
      kind: "school",
    });
    await expect(tenancy.switch(old.headers, org.id)).rejects.toMatchObject({
      code: "MFA_REQUIRED",
    });
    const fresh = new Client();
    const login = await fresh.request("/sign-in/email", {
      email: owner.email,
      password,
    });
    expect(login.data.twoFactorRedirect).toBe(true);
    await expect(tenancy.list(fresh.headers)).rejects.toMatchObject({
      code: "SIGN_IN_REQUIRED",
    });
    expect(
      (
        await fresh.request("/two-factor/verify-backup-code", {
          code: enabled.data.backupCodes[0],
        })
      ).status,
    ).toBe(200);
    await tenancy.switch(fresh.headers, org.id);
    expect(await tenancy.members(fresh.headers)).toHaveLength(1);
    const replay = new Client();
    await replay.request("/sign-in/email", { email: owner.email, password });
    expect(
      (
        await replay.request("/two-factor/verify-backup-code", {
          code: enabled.data.backupCodes[0],
        })
      ).status,
    ).not.toBe(200);
  }, 30000);
  it("password recovery revokes sessions and accepts the reset token only once", async () => {
    const value = await account("Recovery", false),
      old = value.client.headers;
    expect(
      (
        await value.client.request("/request-password-reset", {
          email: value.email,
          redirectTo: `${base}/account/new-password`,
        })
      ).status,
    ).toBe(200);
    const message = mail.findLast(
      (v) => v.to === value.email && v.subject.includes("بازیابی"),
    )!;
    const resetToken = new URL(message.url).pathname.split("/").at(-1)!;
    const fresh = new Client(),
      newPassword = "A-new-synthetic-recovery-password!";
    expect(
      (
        await fresh.request("/reset-password", {
          token: resetToken,
          newPassword,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await fresh.request("/reset-password", {
          token: resetToken,
          newPassword,
        })
      ).status,
    ).not.toBe(200);
    await expect(tenancy.list(old)).rejects.toMatchObject({
      code: "SIGN_IN_REQUIRED",
    });
    expect(
      (
        await fresh.request("/sign-in/email", {
          email: value.email,
          password: newPassword,
        })
      ).status,
    ).toBe(200);
  }, 30000);
  it("an expired invitation is denied and audit rows cannot be changed by the app role", async () => {
    const owner = await account("Expiry"),
      invited = await account("ExpiryGuest", false);
    const org = await tenancy.create(owner.client.headers, {
      name: "Expiry company",
      kind: "company",
    });
    const invitation = await tenancy.invite(owner.client.headers, {
      email: invited.email,
      role: "member",
    });
    const who = await tenancy.actor(owner.client.headers),
      c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT set_config('app.user_id',$1,true),set_config('app.tenant_id',$2,true)",
        [who.userId, org.id],
      );
      await c.query(
        "UPDATE invitation SET expires_at=now()-interval '1 minute' WHERE id=$1",
        [invitation.id],
      );
      expect(
        (
          await c.query(
            "DELETE FROM audit_event WHERE organization_id=$1 RETURNING id",
            [org.id],
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await c.query(
            "UPDATE audit_event SET action='forged' WHERE organization_id=$1 RETURNING id",
            [org.id],
          )
        ).rows,
      ).toHaveLength(0);
      await c.query("COMMIT");
    } finally {
      c.release();
    }
    await expect(
      tenancy.acceptInvite(invited.client.headers, invitation.token),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    expect((await pool.query("SELECT * FROM audit_event")).rows).toHaveLength(
      0,
    );
  }, 30000);
  it("isolates two organizations, atomically accepts invitations once, and revokes suspended membership", async () => {
    const a = await account("SchoolA"),
      b = await account("SchoolB"),
      student = await account("Student", false);
    const orgA = await tenancy.create(a.client.headers, {
      name: "School A",
      kind: "school",
    });
    const orgB = await tenancy.create(b.client.headers, {
      name: "School B",
      kind: "company",
    });
    await expect(
      tenancy.switch(a.client.headers, orgB.id),
    ).rejects.toMatchObject({ code: "MEMBERSHIP_REVOKED" });
    await expect(
      tenancy.invite(a.client.headers, {
        email: student.email,
        role: "member",
        tenantId: orgB.id,
      }),
    ).rejects.toThrow();
    const invite = await tenancy.invite(a.client.headers, {
      email: student.email,
      role: "member",
    });
    await expect(
      tenancy.acceptInvite(b.client.headers, invite.token),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    const results = await Promise.allSettled([
      tenancy.acceptInvite(student.client.headers, invite.token),
      tenancy.acceptInvite(student.client.headers, invite.token),
    ]);
    expect(results.filter((v) => v.status === "fulfilled")).toHaveLength(1);
    await expect(tenancy.members(student.client.headers)).rejects.toMatchObject(
      { code: "MANAGER_REQUIRED" },
    );
    const member = (await tenancy.members(a.client.headers)).find(
      (v) => v.email === student.email,
    )!;
    await expect(
      tenancy.updateMember(b.client.headers, member.id, {
        role: "member",
        status: "suspended",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await tenancy.updateMember(a.client.headers, member.id, {
      role: "member",
      status: "suspended",
    });
    await expect(
      tenancy.switch(student.client.headers, orgA.id),
    ).rejects.toMatchObject({ code: "MEMBERSHIP_REVOKED" });
    expect(await tenancy.members(b.client.headers)).toHaveLength(1);
    // No transaction context leaks to the next pooled connection.
    expect((await pool.query("SELECT * FROM organization")).rows).toHaveLength(
      0,
    );
    expect((await pool.query("SELECT * FROM invitation")).rows).toHaveLength(0);
  }, 30000);
  it("cancels invitations and makes sign-out revoke an already issued session", async () => {
    const owner = await account("Owner"),
      invited = await account("Invitee", false);
    await tenancy.create(owner.client.headers, {
      name: "Personal",
      kind: "personal",
    });
    const invite = await tenancy.invite(owner.client.headers, {
      email: invited.email,
      role: "member",
    });
    await tenancy.cancelInvite(owner.client.headers, invite.id);
    await expect(
      tenancy.acceptInvite(invited.client.headers, invite.token),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    const oldHeaders = owner.client.headers;
    expect((await owner.client.request("/sign-out", {})).status).toBe(200);
    await expect(tenancy.list(oldHeaders)).rejects.toMatchObject({
      code: "SIGN_IN_REQUIRED",
    });
  }, 30000);
});
