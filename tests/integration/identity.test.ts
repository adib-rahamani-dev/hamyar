import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { migrate } from "../../scripts/migrate.mjs";
import { createIdentity, type AuthMail } from "../../src/modules/identity/auth";
import { createTenancy } from "../../src/modules/tenancy/service";
import { assertRuntimeRole } from "../../src/modules/identity/database-role";
import { createRoomRepository } from "../../src/modules/rooms/repository";

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
  constructor(private identity = auth) {}
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
    const response = await this.identity.handler(
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
async function account(name: string) {
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
  return { client, email };
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
  it("retires legacy MFA metadata without deleting accounts and preserves tenant boundaries", async () => {
    const legacy = await account("LegacyMfa");
    const id = (await auth.api.getSession({ headers: legacy.client.headers }))!
      .user.id;
    await pool.query(
      "UPDATE auth_user SET two_factor_enabled=true WHERE id=$1",
      [id],
    );
    await pool.query(
      "UPDATE auth_session SET mfa_verified_at=now() WHERE user_id=$1",
      [id],
    );
    await pool.query(
      "INSERT INTO auth_two_factor(id,user_id,secret,backup_codes) VALUES($1,$2,$3,$4)",
      [randomUUID(), id, "synthetic-retired-secret", "synthetic-retired-codes"],
    );
    const fresh = new Client();
    const login = await fresh.request("/sign-in/email", {
      email: legacy.email,
      password,
    });
    expect(login.status).toBe(200);
    expect(login.data.twoFactorRedirect).toBeUndefined();
    const org = await tenancy.create(fresh.headers, {
      name: "Password school",
      kind: "school",
    });
    const outsider = await account("PasswordOutsider");
    await expect(
      tenancy.switch(outsider.client.headers, org.id),
    ).rejects.toMatchObject({ code: "MEMBERSHIP_REVOKED" });
    const retired = await auth.handler(
      new Request(`${base}/api/auth/two-factor/enable`, {
        method: "POST",
        headers: {
          ...Object.fromEntries(fresh.headers),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      }),
    );
    expect(retired.status).toBe(404);
    const owner = new Pool({
      connectionString: process.env.TEST_MIGRATION_DATABASE_URL,
    });
    try {
      const sql = await import("node:fs/promises").then((fs) =>
        fs.readFile("migrations/0005_disable_authenticator_2fa.sql", "utf8"),
      );
      await owner.query(sql);
    } finally {
      await owner.end();
    }
    expect(
      (
        await pool.query(
          "SELECT two_factor_enabled FROM auth_user WHERE id=$1",
          [id],
        )
      ).rows[0].two_factor_enabled,
    ).toBe(false);
    expect(
      (
        await pool.query("SELECT id FROM auth_two_factor WHERE user_id=$1", [
          id,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await pool.query(
          "SELECT id FROM auth_session WHERE user_id=$1 AND mfa_verified_at IS NOT NULL",
          [id],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (await auth.api.getSession({ headers: fresh.headers }))?.user.id,
    ).toBe(id);
  });
  it("temporary password signup preserves unverified email, invitation isolation and strict rollback", async () => {
    let deliveries = 0;
    const temporary = createIdentity(pool, {
      url: base,
      secret: "integration-fixture-only-never-use-in-production",
      secure: false,
      emailConfigured: false,
      requireEmailVerification: false,
      sendMail: async () => {
        deliveries++;
      },
    });
    const local = createTenancy(pool, temporary);
    const c = new Client(temporary);
    const email = `temporary-${randomUUID()}@example.test`;
    expect(
      (
        await c.request("/sign-up/email", {
          name: "Temporary owner",
          email,
          password,
          emailVerified: true,
          activeOrganizationId: randomUUID(),
          mfaVerifiedAt: new Date(),
        })
      ).status,
    ).toBe(200);
    expect(
      (await temporary.api.getSession({ headers: c.headers }))?.user
        .emailVerified,
    ).toBe(false);
    expect(
      (
        await pool.query(
          "SELECT email_verified FROM auth_user WHERE email=$1",
          [email],
        )
      ).rows[0].email_verified,
    ).toBe(false);
    expect(await local.list(c.headers)).toEqual({
      activeOrganizationId: null,
      organizations: [],
    });
    const owned = await local.create(c.headers, {
      name: "Private temporary school",
      kind: "school",
    });
    expect((await local.list(c.headers)).organizations).toHaveLength(1);
    const other = await account("VerifiedInviter");
    await tenancy.create(other.client.headers, {
      name: "Other school",
      kind: "school",
    });
    const invite = await tenancy.invite(other.client.headers, {
      email,
      role: "member",
    });
    const context = await local.inOrganization(
      c.headers,
      false,
      async (db) => ({
        email: (
          await db.query(
            "SELECT current_setting('app.verified_email') AS email",
          )
        ).rows[0].email,
        invites: (
          await db.query("SELECT id FROM invitation WHERE email=$1", [email])
        ).rows,
      }),
    );
    expect(context).toEqual({ email: "", invites: [] });
    await expect(
      local.acceptInvite(c.headers, invite.token),
    ).rejects.toMatchObject({ code: "EMAIL_VERIFICATION_REQUIRED" });
    expect((await tenancy.invitations(other.client.headers))[0].status).toBe(
      "pending",
    );
    for (const path of [
      "/request-password-reset",
      "/send-verification-email",
    ]) {
      expect((await c.request(path, { email })).status).toBe(503);
    }
    expect(deliveries).toBe(0);
    await expect(tenancy.list(c.headers)).rejects.toMatchObject({
      code: "EMAIL_VERIFICATION_REQUIRED",
    });
    await c.request("/sign-out", {});
    expect(
      (await new Client().request("/sign-in/email", { email, password }))
        .status,
    ).toBe(403);
    expect(
      (await c.request("/sign-in/email", { email, password })).status,
    ).toBe(200);
    expect((await local.list(c.headers)).organizations[0].id).toBe(owned.id);
    expect(deliveries).toBe(0);
  });
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
  it("password recovery revokes sessions and accepts the reset token only once", async () => {
    const value = await account("Recovery"),
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
      invited = await account("ExpiryGuest");
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
      student = await account("Student");
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
  it("blocks account creation and recovery at the server when email delivery is unavailable", async () => {
    const disabled = createIdentity(pool, {
      url: base,
      secret: "integration-email-disabled-fixture-only",
      secure: false,
      emailConfigured: false,
      sendMail: async () => {
        throw Error("Should not send");
      },
    });
    const email = `disabled-${randomUUID()}@example.test`;
    const response = await disabled.handler(
      new Request(`${base}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Blocked account", email, password }),
      }),
    );
    expect(response.status).toBe(503);
    expect(
      (await pool.query("SELECT id FROM auth_user WHERE email=$1", [email]))
        .rows,
    ).toHaveLength(0);
    const recovery = await disabled.handler(
      new Request(`${base}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `${base}/account/new-password`,
        }),
      }),
    );
    expect(recovery.status).toBe(503);
  });
  it("persists rooms and assignments with tenant separation, server-derived roles and member admission", async () => {
    const a = await account("RoomOwnerA"),
      b = await account("RoomOwnerB"),
      student = await account("RoomStudent");
    const repo = createRoomRepository(pool, auth);
    await tenancy.create(a.client.headers, {
      name: "Room Organization A",
      kind: "school",
    });
    await tenancy.create(b.client.headers, {
      name: "Room Organization B",
      kind: "company",
    });
    const invite = await tenancy.invite(a.client.headers, {
      email: student.email,
      role: "member",
    });
    await tenancy.acceptInvite(student.client.headers, invite.token);
    await expect(
      repo.create(student.client.headers, { title: "Unauthorized room" }),
    ).rejects.toMatchObject({ code: "MANAGER_REQUIRED" });
    const room = await repo.create(a.client.headers, {
      title: "Persistent room",
    });
    expect(await repo.list(b.client.headers)).toHaveLength(0);
    expect(await repo.list(student.client.headers)).toHaveLength(0);
    await expect(
      repo.supervision(student.client.headers),
    ).rejects.toMatchObject({ code: "MANAGER_REQUIRED" });
    expect((await repo.supervision(b.client.headers)).rooms).toHaveLength(0);
    expect((await repo.supervision(a.client.headers)).rooms[0]?.id).toBe(
      room.id,
    );
    await expect(repo.context(b.client.headers, room.id)).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
    await expect(
      repo.update(b.client.headers, room.id, { state: "open" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const foreign = (await tenancy.members(b.client.headers))[0]!;
    await expect(
      repo.assign(a.client.headers, room.id, {
        membershipId: foreign.id,
        role: "attendee",
        admitted: true,
      }),
    ).rejects.toMatchObject({ code: "MEMBERSHIP_REQUIRED" });
    const studentId = (await auth.api.getSession({
      headers: student.client.headers,
    }))!.user.id;
    const member = (await tenancy.members(a.client.headers)).find(
      (m) => m.userId === studentId,
    )!;
    await repo.assign(a.client.headers, room.id, {
      membershipId: member.id,
      role: "attendee",
      admitted: true,
    });
    expect(await repo.list(student.client.headers)).toHaveLength(1);
    await expect(
      repo.context(student.client.headers, room.id),
    ).rejects.toMatchObject({ code: "ROOM_ACCESS_DENIED" });
    await repo.update(a.client.headers, room.id, { state: "open" });
    const context = await repo.context(student.client.headers, room.id);
    expect(context.actor.organizationRole).toBe("member");
    expect(context.assignment?.role).toBe("attendee");
    expect(context.mediaApproval).toBeNull();
    await repo.update(a.client.headers, room.id, { locked: true });
    await expect(
      repo.context(student.client.headers, room.id),
    ).rejects.toMatchObject({ code: "ROOM_ACCESS_DENIED" });
    await expect(
      repo.assign(a.client.headers, room.id, {
        membershipId: member.id,
        role: "presenter",
        admitted: true,
      }),
    ).rejects.toMatchObject({ code: "ASSIGN_BEFORE_ROOM_START" });
    await repo.update(a.client.headers, room.id, { state: "ended" });
    await expect(repo.context(a.client.headers, room.id)).rejects.toMatchObject(
      { code: "ROOM_ACCESS_DENIED" },
    );
    expect((await pool.query("SELECT * FROM meeting_room")).rows).toHaveLength(
      0,
    );
    expect(
      (await pool.query("SELECT * FROM room_assignment")).rows,
    ).toHaveLength(0);
  }, 30000);
  it("cancels invitations and makes sign-out revoke an already issued session", async () => {
    const owner = await account("Owner"),
      invited = await account("Invitee");
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
