import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import type { Identity } from "../identity/auth";

export class DomainError extends Error {
  constructor(
    public code: string,
    public status = 403,
  ) {
    super(code);
  }
}
type Actor = {
  userId: string;
  email: string;
  emailVerified: boolean;
  sessionId: string;
  organizationId: string | null;
  mfa: boolean;
  mfaRequired: boolean;
};
type Membership = {
  id: string;
  role: "owner" | "admin" | "supervisor" | "member";
  status: "active" | "suspended";
};
const orgInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    kind: z.enum(["school", "company", "personal"]),
  })
  .strict();
const inviteInput = z
  .object({
    email: z
      .string()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    role: z.enum(["admin", "supervisor", "member"]),
  })
  .strict();
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function createTenancy(pool: Pool, auth: Identity) {
  async function actor(headers: Headers): Promise<Actor> {
    const current = await auth.api.getSession({ headers });
    if (!current) throw new DomainError("SIGN_IN_REQUIRED", 401);
    if (
      !current.user.emailVerified &&
      auth.options.emailAndPassword?.requireEmailVerification !== false
    )
      throw new DomainError("EMAIL_VERIFICATION_REQUIRED");
    return {
      userId: current.user.id,
      email: current.user.email.toLowerCase(),
      emailVerified: current.user.emailVerified,
      sessionId: current.session.id,
      organizationId: current.session.activeOrganizationId ?? null,
      mfa: !!current.user.twoFactorEnabled && !!current.session.mfaVerifiedAt,
      mfaRequired: !!current.user.twoFactorEnabled,
    };
  }
  async function transaction<T>(
    who: Actor,
    run: (c: PoolClient) => Promise<T>,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.user_id',$1,true),set_config('app.verified_email',$2,true),set_config('app.tenant_id',$3,true)",
        [who.userId, who.emailVerified ? who.email : "", ""],
      );
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async function scope(c: PoolClient, who: Actor, manage = false) {
    if (!who.organizationId)
      throw new DomainError("ORGANIZATION_REQUIRED", 409);
    await c.query("SELECT set_config('app.tenant_id',$1,true)", [
      who.organizationId,
    ]);
    const found = await c.query<Membership>(
      "SELECT id,role,status FROM membership WHERE organization_id=$1 AND user_id=$2 FOR SHARE",
      [who.organizationId, who.userId],
    );
    const member = found.rows[0];
    if (!member || member.status !== "active")
      throw new DomainError("MEMBERSHIP_REVOKED");
    if (member.role !== "member" && who.mfaRequired && !who.mfa)
      throw new DomainError("MFA_REQUIRED", 428);
    if (manage && member.role === "member")
      throw new DomainError("MANAGER_REQUIRED");
    return member;
  }
  async function audit(
    c: PoolClient,
    who: Actor,
    action: string,
    target: string,
  ) {
    await c.query(
      "INSERT INTO audit_event(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,$4,$5)",
      [randomUUID(), who.organizationId, who.userId, action, target],
    );
  }
  return {
    actor,
    async inOrganization<T>(
      headers: Headers,
      manage: boolean,
      run: (
        client: PoolClient,
        current: Actor & { organizationId: string; role: Membership["role"] },
      ) => Promise<T>,
    ) {
      const who = await actor(headers);
      return transaction(who, async (client) => {
        const member = await scope(client, who, manage);
        return run(client, {
          ...who,
          organizationId: who.organizationId!,
          role: member.role,
        });
      });
    },
    async list(headers: Headers) {
      const who = await actor(headers);
      return transaction(who, async (c) => ({
        activeOrganizationId: who.organizationId,
        organizations: (
          await c.query(
            "SELECT o.id,o.name,o.kind,m.role FROM membership m JOIN organization o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.status='active' ORDER BY o.created_at",
            [who.userId],
          )
        ).rows,
      }));
    },
    async create(headers: Headers, input: unknown) {
      const value = orgInput.parse(input);
      const who = await actor(headers);
      if (who.mfaRequired && !who.mfa)
        throw new DomainError("MFA_REQUIRED", 428);
      return transaction(who, async (c) => {
        const id = randomUUID();
        who.organizationId = id;
        await c.query("SELECT set_config('app.tenant_id',$1,true)", [id]);
        await c.query(
          "INSERT INTO organization(id,name,kind) VALUES($1,$2,$3)",
          [id, value.name, value.kind],
        );
        await c.query(
          "INSERT INTO membership(id,organization_id,user_id,role) VALUES($1,$2,$3,'owner')",
          [randomUUID(), id, who.userId],
        );
        await c.query(
          "UPDATE auth_session SET active_organization_id=$1 WHERE id=$2 AND user_id=$3",
          [id, who.sessionId, who.userId],
        );
        await audit(c, who, "organization.create", id);
        return { id, ...value };
      });
    },
    async switch(headers: Headers, organizationId: string) {
      z.string().uuid().parse(organizationId);
      const who = await actor(headers);
      who.organizationId = organizationId;
      return transaction(who, async (c) => {
        await scope(c, who);
        await c.query(
          "UPDATE auth_session SET active_organization_id=$1 WHERE id=$2 AND user_id=$3",
          [organizationId, who.sessionId, who.userId],
        );
        return { id: organizationId };
      });
    },
    async members(headers: Headers) {
      const who = await actor(headers);
      return transaction(who, async (c) => {
        await scope(c, who, true);
        return (
          await c.query(
            'SELECT m.id,m.user_id AS "userId",m.role,m.status,u.name,u.email FROM membership m JOIN auth_user u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY m.created_at LIMIT 100',
            [who.organizationId],
          )
        ).rows;
      });
    },
    async updateMember(headers: Headers, id: string, input: unknown) {
      z.string().uuid().parse(id);
      const value = z
        .object({
          role: z.enum(["admin", "supervisor", "member"]),
          status: z.enum(["active", "suspended"]),
        })
        .strict()
        .parse(input);
      const who = await actor(headers);
      return transaction(who, async (c) => {
        await scope(c, who, true);
        const target = (
          await c.query(
            "SELECT user_id,role FROM membership WHERE id=$1 AND organization_id=$2 FOR UPDATE",
            [id, who.organizationId],
          )
        ).rows[0];
        if (!target) throw new DomainError("NOT_FOUND", 404);
        if (target.role === "owner" || target.user_id === who.userId)
          throw new DomainError("PROTECTED_MEMBERSHIP");
        await c.query(
          "UPDATE membership SET role=$1,status=$2 WHERE id=$3 AND organization_id=$4",
          [value.role, value.status, id, who.organizationId],
        );
        await audit(c, who, "membership.update", id);
        return { id };
      });
    },
    async invite(headers: Headers, input: unknown) {
      const value = inviteInput.parse(input);
      const who = await actor(headers);
      return transaction(who, async (c) => {
        await scope(c, who, true);
        const id = randomUUID(),
          token = randomBytes(32).toString("base64url");
        await c.query(
          "INSERT INTO invitation(id,organization_id,email,role,token_hash,expires_at,created_by) VALUES($1,$2,$3,$4,$5,now()+interval '48 hours',$6)",
          [
            id,
            who.organizationId,
            value.email,
            value.role,
            tokenHash(token),
            who.userId,
          ],
        );
        await audit(c, who, "invitation.create", id);
        return { id, token };
      });
    },
    async cancelInvite(headers: Headers, id: string) {
      z.string().uuid().parse(id);
      const who = await actor(headers);
      return transaction(who, async (c) => {
        await scope(c, who, true);
        const result = await c.query(
          "UPDATE invitation SET status='cancelled' WHERE id=$1 AND organization_id=$2 AND status='pending' RETURNING id",
          [id, who.organizationId],
        );
        if (!result.rows.length) throw new DomainError("NOT_FOUND", 404);
        await audit(c, who, "invitation.cancel", id);
        return { id };
      });
    },
    async invitations(headers: Headers) {
      const who = await actor(headers);
      return transaction(who, async (c) => {
        await scope(c, who, true);
        return (
          await c.query(
            "SELECT id,email,role,status,expires_at FROM invitation WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100",
            [who.organizationId],
          )
        ).rows;
      });
    },
    async acceptInvite(headers: Headers, token: string) {
      z.string()
        .regex(/^[\w-]{43}$/)
        .parse(token);
      const who = await actor(headers);
      // Email ownership is mandatory even while password signup is temporary.
      if (!who.emailVerified)
        throw new DomainError("EMAIL_VERIFICATION_REQUIRED");
      return transaction(who, async (c) => {
        const candidate = (
          await c.query(
            "SELECT organization_id FROM invitation WHERE token_hash=$1 AND email=$2 AND status='pending' AND expires_at>now()",
            [tokenHash(token), who.email],
          )
        ).rows[0];
        if (!candidate) throw new DomainError("INVITATION_INVALID", 404);
        who.organizationId = candidate.organization_id;
        await c.query("SELECT set_config('app.tenant_id',$1,true)", [
          who.organizationId,
        ]);
        const invite = (
          await c.query(
            "SELECT id,organization_id,role FROM invitation WHERE token_hash=$1 AND email=$2 AND status='pending' AND expires_at>now() FOR UPDATE",
            [tokenHash(token), who.email],
          )
        ).rows[0];
        if (!invite) throw new DomainError("INVITATION_INVALID", 404);
        if (invite.role !== "member" && who.mfaRequired && !who.mfa)
          throw new DomainError("MFA_REQUIRED", 428);
        who.organizationId = invite.organization_id;
        await c.query("SELECT set_config('app.tenant_id',$1,true)", [
          who.organizationId,
        ]);
        // A fresh invitation never silently restores a suspended membership.
        await c.query(
          "INSERT INTO membership(id,organization_id,user_id,role) VALUES($1,$2,$3,$4)",
          [randomUUID(), who.organizationId, who.userId, invite.role],
        );
        await c.query("UPDATE invitation SET status='accepted' WHERE id=$1", [
          invite.id,
        ]);
        await c.query(
          "UPDATE auth_session SET active_organization_id=$1 WHERE id=$2 AND user_id=$3",
          [who.organizationId, who.sessionId, who.userId],
        );
        await audit(c, who, "invitation.accept", invite.id);
        return { id: who.organizationId };
      });
    },
  };
}
