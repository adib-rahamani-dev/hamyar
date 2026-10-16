import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import type { Identity } from "../identity/auth";
import { createTenancy, DomainError } from "../tenancy/service";
import { canAccessRoom, type RoomAccessContext } from "./policy";
const createInput = z
  .object({
    title: z.string().trim().min(2).max(120),
    hostMembershipId: z.uuid().optional(),
  })
  .strict();
const assignmentInput = z
  .object({
    membershipId: z.uuid(),
    role: z.enum(["host", "presenter", "attendee"]),
    admitted: z.boolean(),
  })
  .strict();
export function createRoomRepository(pool: Pool, auth: Identity) {
  const tenancy = createTenancy(pool, auth);
  return {
    async supervision(headers: Headers) {
      return tenancy.inOrganization(headers, true, async (c, who) => ({
        organization: (
          await c.query("SELECT name FROM organization WHERE id=$1", [
            who.organizationId,
          ])
        ).rows[0] as { name: string },
        members: Number(
          (
            await c.query(
              "SELECT count(*)::integer AS count FROM membership WHERE organization_id=$1 AND status='active'",
              [who.organizationId],
            )
          ).rows[0].count,
        ),
        rooms: (
          await c.query(
            `SELECT r.id,r.title,r.state,r.locked,
              (SELECT count(*)::integer FROM classroom_presence p JOIN membership m ON m.organization_id=p.organization_id AND m.user_id=p.user_id AND m.status='active' WHERE p.organization_id=r.organization_id AND p.room_id=r.id AND p.last_seen>now()-interval '45 seconds') AS present,
              (SELECT string_agg(u.name,'، ') FROM room_assignment a JOIN membership m ON m.organization_id=a.organization_id AND m.id=a.membership_id JOIN auth_user u ON u.id=m.user_id WHERE a.organization_id=r.organization_id AND a.room_id=r.id AND a.role='host' AND NOT a.banned AND m.status='active') AS hosts
              FROM meeting_room r WHERE r.organization_id=$1 ORDER BY r.created_at DESC LIMIT 100`,
            [who.organizationId],
          )
        ).rows as {
          id: string;
          title: string;
          state: "scheduled" | "open" | "ended";
          locked: boolean;
          present: number;
          hosts: string | null;
        }[],
        openTickets: Number(
          (
            await c.query(
              "SELECT count(*)::integer AS count FROM support_ticket WHERE organization_id=$1 AND status<>'closed'",
              [who.organizationId],
            )
          ).rows[0].count,
        ),
      }));
    },
    async list(headers: Headers) {
      return tenancy.inOrganization(
        headers,
        false,
        async (c, who) =>
          (
            await c.query(
              "SELECT r.id,r.title,r.state,r.locked FROM meeting_room r WHERE r.organization_id=$1 AND ($3 OR EXISTS (SELECT 1 FROM room_assignment a JOIN membership m ON m.organization_id=a.organization_id AND m.id=a.membership_id WHERE a.organization_id=r.organization_id AND a.room_id=r.id AND m.user_id=$2 AND m.status='active' AND NOT a.banned)) ORDER BY r.created_at DESC LIMIT 100",
              [who.organizationId, who.userId, who.role !== "member"],
            )
          ).rows,
      );
    },
    async create(headers: Headers, input: unknown) {
      const value = createInput.parse(input);
      return tenancy.inOrganization(headers, true, async (c, who) => {
        const host = (
          await c.query(
            "SELECT id FROM membership WHERE organization_id=$1 AND status='active' AND ($2::text IS NOT NULL AND id=$2 OR $2::text IS NULL AND user_id=$3)",
            [who.organizationId, value.hostMembershipId ?? null, who.userId],
          )
        ).rows[0];
        if (!host) throw new DomainError("HOST_MEMBERSHIP_REQUIRED", 400);
        const id = randomUUID();
        await c.query(
          "INSERT INTO meeting_room(id,organization_id,title,created_by) VALUES($1,$2,$3,$4)",
          [id, who.organizationId, value.title, who.userId],
        );
        await c.query(
          "INSERT INTO room_assignment(id,organization_id,room_id,membership_id,role,admitted) VALUES($1,$2,$3,$4,'host',true)",
          [randomUUID(), who.organizationId, id, host.id],
        );
        await c.query(
          "INSERT INTO audit_event(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'room.create',$4)",
          [randomUUID(), who.organizationId, who.userId, id],
        );
        return { id, title: value.title, state: "scheduled", locked: false };
      });
    },
    async context(headers: Headers, id: string): Promise<RoomAccessContext> {
      z.uuid().parse(id);
      return tenancy.inOrganization(headers, false, async (c, who) => {
        const room = (
          await c.query(
            "SELECT id,organization_id,state,locked FROM meeting_room WHERE organization_id=$1 AND id=$2",
            [who.organizationId, id],
          )
        ).rows[0];
        if (!room) throw new DomainError("NOT_FOUND", 404);
        const assignment =
          (
            await c.query(
              "SELECT a.role,a.admitted,a.banned,a.audio_allowed,a.camera_allowed,a.screen_allowed,a.grant_expires_at FROM room_assignment a JOIN membership m ON m.organization_id=a.organization_id AND m.id=a.membership_id WHERE a.organization_id=$1 AND a.room_id=$2 AND m.user_id=$3 AND m.status='active'",
              [who.organizationId, id, who.userId],
            )
          ).rows[0] ?? null;
        const context: RoomAccessContext = {
          actor: {
            userId: who.userId,
            organizationId: who.organizationId,
            organizationRole: who.role,
            membershipActive: true,
          },
          room: {
            id: room.id,
            organizationId: room.organization_id,
            state: room.state,
            locked: room.locked,
            privacy: "standard",
          },
          assignment,
          mediaApproval: assignment?.grant_expires_at
            ? {
                audio: assignment.audio_allowed,
                camera: assignment.camera_allowed,
                screen: assignment.screen_allowed,
                expiresAt: new Date(assignment.grant_expires_at).getTime(),
              }
            : null,
        };
        if (!canAccessRoom(context, "join"))
          throw new DomainError("ROOM_ACCESS_DENIED");
        return context;
      });
    },
    async update(headers: Headers, id: string, input: unknown) {
      z.uuid().parse(id);
      const value = z
        .object({
          state: z.enum(["open", "ended"]).optional(),
          locked: z.boolean().optional(),
        })
        .strict()
        .refine((v) => v.state !== undefined || v.locked !== undefined)
        .parse(input);
      return tenancy.inOrganization(headers, true, async (c, who) => {
        const room = (
          await c.query(
            "SELECT state FROM meeting_room WHERE organization_id=$1 AND id=$2 FOR UPDATE",
            [who.organizationId, id],
          )
        ).rows[0];
        if (!room) throw new DomainError("NOT_FOUND", 404);
        if (room.state === "ended") throw new DomainError("ROOM_ENDED", 409);
        await c.query(
          "UPDATE meeting_room SET state=COALESCE($3,state),locked=COALESCE($4,locked) WHERE organization_id=$1 AND id=$2",
          [who.organizationId, id, value.state ?? null, value.locked ?? null],
        );
        await c.query(
          "INSERT INTO audit_event(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'room.update',$4)",
          [randomUUID(), who.organizationId, who.userId, id],
        );
        return { id };
      });
    },
    async assign(headers: Headers, id: string, input: unknown) {
      z.uuid().parse(id);
      const value = assignmentInput.parse(input);
      return tenancy.inOrganization(headers, true, async (c, who) => {
        const room = (
          await c.query(
            "SELECT state FROM meeting_room WHERE organization_id=$1 AND id=$2 FOR SHARE",
            [who.organizationId, id],
          )
        ).rows[0];
        if (!room) throw new DomainError("NOT_FOUND", 404);
        if (room.state !== "scheduled")
          throw new DomainError("ASSIGN_BEFORE_ROOM_START", 409);
        const member = (
          await c.query(
            "SELECT id FROM membership WHERE organization_id=$1 AND id=$2 AND status='active' FOR SHARE",
            [who.organizationId, value.membershipId],
          )
        ).rows[0];
        if (!member) throw new DomainError("MEMBERSHIP_REQUIRED");
        await c.query(
          "INSERT INTO room_assignment(id,organization_id,room_id,membership_id,role,admitted) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(organization_id,room_id,membership_id) DO UPDATE SET role=EXCLUDED.role,admitted=EXCLUDED.admitted",
          [
            randomUUID(),
            who.organizationId,
            id,
            member.id,
            value.role,
            value.admitted,
          ],
        );
        await c.query(
          "INSERT INTO audit_event(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'room.assign',$4)",
          [randomUUID(), who.organizationId, who.userId, id],
        );
        return { id };
      });
    },
  };
}
