import { randomUUID, randomBytes, createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { Identity } from "../identity/auth";
import { createTenancy, DomainError } from "../tenancy/service";
import {
  boardCommand,
  messageInput,
  memberCommand,
  type Stroke,
} from "./input";
type Access = {
  organizationId: string;
  userId: string;
  sessionId: string;
  role: string;
  manager: boolean;
  canDraw: boolean;
  canSpeak: boolean;
  state: string;
  locked: boolean;
};
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
/** All room actions re-read membership + assignment inside a scoped transaction.
 * Polling deliberately works on Vercel and a plain Linux/PG deployment without a hosted realtime vendor.
 */
export function createClassroom(pool: Pool, auth: Identity) {
  const tenancy = createTenancy(pool, auth);
  async function scope<T>(
    headers: Headers,
    roomId: string,
    write: boolean,
    run: (c: PoolClient, a: Access) => Promise<T>,
  ) {
    z.uuid().parse(roomId);
    return tenancy.inOrganization(headers, false, async (c, who) => {
      const r = (
        await c.query(
          "SELECT state,locked FROM meeting_room WHERE organization_id=$1 AND id=$2 FOR SHARE",
          [who.organizationId, roomId],
        )
      ).rows[0];
      if (!r) throw new DomainError("NOT_FOUND", 404);
      const assigned = (
        await c.query(
          "SELECT a.* FROM room_assignment a JOIN membership m ON m.organization_id=a.organization_id AND m.id=a.membership_id WHERE a.organization_id=$1 AND a.room_id=$2 AND m.user_id=$3 AND m.status='active'",
          [who.organizationId, roomId, who.userId],
        )
      ).rows[0];
      const manager = who.role !== "member" || assigned?.role === "host";
      if (assigned?.banned || (!manager && (!assigned?.admitted || r.locked)))
        throw new DomainError("ROOM_ACCESS_DENIED");
      if (write && r.state !== "open")
        throw new DomainError("ROOM_NOT_OPEN", 409);
      const granted =
        !!assigned?.grant_expires_at &&
        new Date(assigned.grant_expires_at).getTime() > Date.now();
      return run(c, {
        ...who,
        manager,
        state: r.state,
        locked: r.locked,
        canDraw:
          manager ||
          assigned?.role === "presenter" ||
          (granted && assigned.board_allowed),
        canSpeak:
          manager ||
          assigned?.role === "presenter" ||
          (granted && assigned.audio_allowed),
      });
    });
  }
  async function audit(
    c: PoolClient,
    a: Access,
    action: string,
    target: string,
  ) {
    await c.query(
      "INSERT INTO audit_event(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,$4,$5)",
      [randomUUID(), a.organizationId, a.userId, action, target],
    );
  }
  return {
    async state(headers: Headers, roomId: string, input: unknown) {
      const value = z
        .object({
          state: z.enum(["open", "ended"]).optional(),
          locked: z.boolean().optional(),
        })
        .strict()
        .refine((v) => v.state !== undefined || v.locked !== undefined)
        .parse(input);
      return scope(headers, roomId, false, async (c, a) => {
        if (!a.manager) throw new DomainError("MANAGER_REQUIRED");
        if (a.state === "ended") throw new DomainError("ROOM_ENDED", 409);
        await c.query(
          "UPDATE meeting_room SET state=COALESCE($3,state),locked=COALESCE($4,locked) WHERE organization_id=$1 AND id=$2",
          [a.organizationId, roomId, value.state ?? null, value.locked ?? null],
        );
        if (value.state === "ended")
          await c.query(
            "DELETE FROM classroom_presence WHERE organization_id=$1 AND room_id=$2",
            [a.organizationId, roomId],
          );
        await audit(c, a, "classroom.state", roomId);
        return { saved: true };
      });
    },
    async snapshot(headers: Headers, roomId: string) {
      return scope(headers, roomId, false, async (c, a) => {
        const room = (
          await c.query(
            "SELECT id,title,state,locked FROM meeting_room WHERE organization_id=$1 AND id=$2",
            [a.organizationId, roomId],
          )
        ).rows[0];
        const me = (
          await c.query("SELECT name FROM auth_user WHERE id=$1", [a.userId])
        ).rows[0];
        const board = (
          await c.query(
            "SELECT revision,strokes FROM classroom_board WHERE organization_id=$1 AND room_id=$2",
            [a.organizationId, roomId],
          )
        ).rows[0] ?? { revision: 0, strokes: [] };
        const messages = (
          await c.query(
            'SELECT * FROM (SELECT x.id,u.name,CASE WHEN x.hidden THEN \'\' ELSE x.body END AS body,x.user_id=$3 AS mine,x.hidden,x.created_at AS "createdAt" FROM classroom_message x JOIN auth_user u ON u.id=x.user_id WHERE x.organization_id=$1 AND x.room_id=$2 ORDER BY x.created_at DESC,x.id DESC LIMIT 80) recent ORDER BY "createdAt",id',
            [a.organizationId, roomId, a.userId],
          )
        ).rows;
        const people = (
          await c.query(
            `SELECT m.id AS "membershipId",m.user_id AS "userId",u.name,COALESCE(ra.role,'host') AS role,COALESCE(ra.admitted,true) AS admitted,COALESCE(ra.banned,false) AS banned,m.role<>'member' AS protected,COALESCE(p.last_seen>now()-interval '45 seconds',false) AS present,COALESCE(p.raised_hand,false) AS "raisedHand",(m.role<>'member' OR ra.role IN ('host','presenter') OR COALESCE(ra.audio_allowed AND ra.grant_expires_at>now(),false)) AS "canSpeak" FROM membership m JOIN auth_user u ON u.id=m.user_id LEFT JOIN room_assignment ra ON ra.organization_id=m.organization_id AND ra.membership_id=m.id AND ra.room_id=$2 LEFT JOIN classroom_presence p ON p.organization_id=m.organization_id AND p.room_id=$2 AND p.user_id=m.user_id WHERE m.organization_id=$1 AND m.status='active' AND (ra.id IS NOT NULL OR (m.role<>'member' AND p.last_seen>now()-interval '45 seconds')) ORDER BY present DESC,u.name LIMIT 200`,
            [a.organizationId, roomId],
          )
        ).rows;
        const brand = (
          await c.query(
            "SELECT COALESCE(b.display_name,o.name) AS \"displayName\",COALESCE(b.tone,'emerald') AS tone,COALESCE(b.welcome,'') AS welcome FROM organization o LEFT JOIN organization_brand b ON b.organization_id=o.id WHERE o.id=$1",
            [a.organizationId],
          )
        ).rows[0];
        return {
          room,
          me: {
            userId: a.userId,
            name: me.name,
            manager: a.manager,
            canDraw: a.canDraw,
            canSpeak: a.canSpeak,
          },
          board,
          messages,
          people,
          brand,
        };
      });
    },
    async message(headers: Headers, roomId: string, input: unknown) {
      const value = messageInput.parse(input);
      return scope(headers, roomId, true, async (c, a) => {
        await c.query(
          "INSERT INTO classroom_message(id,organization_id,room_id,user_id,client_id,body) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(organization_id,room_id,user_id,client_id) DO NOTHING",
          [
            randomUUID(),
            a.organizationId,
            roomId,
            a.userId,
            value.clientId,
            value.body,
          ],
        );
        return { saved: true };
      });
    },
    async hideMessage(headers: Headers, roomId: string, input: unknown) {
      const value = z.object({ messageId: z.uuid() }).strict().parse(input);
      return scope(headers, roomId, true, async (c, a) => {
        if (!a.manager) throw new DomainError("MANAGER_REQUIRED");
        const result = await c.query(
          "UPDATE classroom_message SET hidden=true WHERE organization_id=$1 AND room_id=$2 AND id=$3 RETURNING id",
          [a.organizationId, roomId, value.messageId],
        );
        if (!result.rows.length) throw new DomainError("NOT_FOUND", 404);
        await audit(c, a, "chat.hide", value.messageId);
        return { saved: true };
      });
    },
    async board(headers: Headers, roomId: string, input: unknown) {
      const value = boardCommand.parse(input);
      return scope(headers, roomId, true, async (c, a) => {
        if (!a.canDraw) throw new DomainError("BOARD_PERMISSION_REQUIRED");
        await c.query(
          "INSERT INTO classroom_board(organization_id,room_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [a.organizationId, roomId],
        );
        const current = (
          await c.query(
            "SELECT revision,strokes FROM classroom_board WHERE organization_id=$1 AND room_id=$2 FOR UPDATE",
            [a.organizationId, roomId],
          )
        ).rows[0] as { revision: number; strokes: Stroke[] };
        let strokes = current.strokes;
        if (value.action === "add") {
          if (strokes.some((s) => s.id === value.stroke.id)) return current;
          if (strokes.length >= 200) throw new DomainError("BOARD_FULL", 409);
          strokes = [...strokes, { ...value.stroke, author: a.userId }];
        } else {
          if (value.revision !== current.revision)
            throw new DomainError("BOARD_CHANGED", 409);
          if (value.action === "clear") {
            if (!a.manager) throw new DomainError("MANAGER_REQUIRED");
            strokes = [];
            await audit(c, a, "board.clear", roomId);
          } else {
            const index = strokes.findLastIndex((s) => s.author === a.userId);
            if (index < 0) return current;
            strokes = strokes.filter((_, i) => i !== index);
          }
        }
        const result = await c.query(
          "UPDATE classroom_board SET strokes=$3::jsonb,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND room_id=$2 RETURNING revision,strokes",
          [a.organizationId, roomId, JSON.stringify(strokes)],
        );
        return result.rows[0];
      });
    },
    async presence(headers: Headers, roomId: string, input: unknown) {
      const value = z
        .object({
          raisedHand: z.boolean().optional(),
          leave: z.boolean().optional(),
        })
        .strict()
        .parse(input);
      return scope(headers, roomId, false, async (c, a) => {
        if (value.leave)
          await c.query(
            "DELETE FROM classroom_presence WHERE organization_id=$1 AND room_id=$2 AND user_id=$3",
            [a.organizationId, roomId, a.userId],
          );
        else if (a.state === "open")
          await c.query(
            "INSERT INTO classroom_presence(organization_id,room_id,user_id,raised_hand) VALUES($1,$2,$3,COALESCE($4,false)) ON CONFLICT(organization_id,room_id,user_id) DO UPDATE SET last_seen=now(),raised_hand=COALESCE($4,classroom_presence.raised_hand)",
            [a.organizationId, roomId, a.userId, value.raisedHand ?? null],
          );
        return { saved: true };
      });
    },
    async control(headers: Headers, roomId: string, input: unknown) {
      const value = memberCommand.parse(input);
      return scope(headers, roomId, true, async (c, a) => {
        if (!a.manager) throw new DomainError("MANAGER_REQUIRED");
        const member = (
          await c.query(
            "SELECT m.user_id,m.role,ra.role AS room_role FROM membership m JOIN room_assignment ra ON ra.organization_id=m.organization_id AND ra.membership_id=m.id WHERE m.organization_id=$1 AND m.id=$2 AND ra.room_id=$3 AND m.status='active' FOR UPDATE OF ra",
            [a.organizationId, value.membershipId, roomId],
          )
        ).rows[0];
        if (
          !member ||
          member.user_id === a.userId ||
          member.role !== "member" ||
          member.room_role === "host"
        )
          throw new DomainError("PROTECTED_MEMBERSHIP");
        if (value.action === "admit")
          await c.query(
            "UPDATE room_assignment SET admitted=true WHERE organization_id=$1 AND room_id=$2 AND membership_id=$3 AND NOT banned",
            [a.organizationId, roomId, value.membershipId],
          );
        else
          await c.query(
            "UPDATE room_assignment SET role=CASE WHEN NOT $4 AND role='presenter' THEN 'attendee' ELSE role END,board_allowed=$4,audio_allowed=$4,camera_allowed=$4,screen_allowed=$4,grant_expires_at=CASE WHEN $4 THEN now()+interval '10 minutes' ELSE NULL END,banned=CASE WHEN $5 THEN true ELSE banned END WHERE organization_id=$1 AND room_id=$2 AND membership_id=$3",
            [
              a.organizationId,
              roomId,
              value.membershipId,
              value.action === "allow",
              value.action === "ban",
            ],
          );
        await audit(c, a, `room.${value.action}`, value.membershipId);
        return { saved: true };
      });
    },
    async createLink(headers: Headers, roomId: string, input: unknown) {
      const value = z
        .object({
          hours: z.number().int().min(1).max(72),
          maxUses: z.number().int().min(1).max(200),
        })
        .strict()
        .parse(input);
      return scope(headers, roomId, false, async (c, a) => {
        if (!a.manager) throw new DomainError("MANAGER_REQUIRED");
        if (a.state === "ended") throw new DomainError("ROOM_ENDED", 409);
        const token = randomBytes(32).toString("base64url"),
          id = randomUUID();
        await c.query(
          "INSERT INTO classroom_link(id,organization_id,room_id,token_hash,expires_at,max_uses,created_by) VALUES($1,$2,$3,$4,now()+$5*interval '1 hour',$6,$7)",
          [
            id,
            a.organizationId,
            roomId,
            hash(token),
            value.hours,
            value.maxUses,
            a.userId,
          ],
        );
        await audit(c, a, "room.link.create", id);
        return { id, token };
      });
    },
    async links(headers: Headers, roomId: string) {
      return scope(headers, roomId, false, async (c, a) => {
        if (!a.manager) throw new DomainError("MANAGER_REQUIRED");
        return (
          await c.query(
            'SELECT id,expires_at AS "expiresAt",uses,max_uses AS "maxUses",revoked FROM classroom_link WHERE organization_id=$1 AND room_id=$2 ORDER BY created_at DESC LIMIT 20',
            [a.organizationId, roomId],
          )
        ).rows;
      });
    },
    async revokeLink(headers: Headers, roomId: string, input: unknown) {
      const value = z.object({ id: z.uuid() }).strict().parse(input);
      return scope(headers, roomId, false, async (c, a) => {
        if (!a.manager) throw new DomainError("MANAGER_REQUIRED");
        await c.query(
          "UPDATE classroom_link SET revoked=true WHERE organization_id=$1 AND room_id=$2 AND id=$3",
          [a.organizationId, roomId, value.id],
        );
        await audit(c, a, "room.link.revoke", value.id);
        return { saved: true };
      });
    },
    async redeem(headers: Headers, input: unknown) {
      const value = z
        .object({ token: z.string().regex(/^[\w-]{43}$/) })
        .strict()
        .parse(input);
      return tenancy.inIdentity(headers, async (c, who) => {
        await c.query("SELECT set_config('app.room_link_hash',$1,true)", [
          hash(value.token),
        ]);
        const candidate = (
          await c.query(
            "SELECT organization_id FROM classroom_link WHERE token_hash=$1 AND NOT revoked AND expires_at>now()",
            [hash(value.token)],
          )
        ).rows[0];
        if (!candidate) throw new DomainError("ROOM_LINK_INVALID", 404);
        await c.query("SELECT set_config('app.tenant_id',$1,true)", [
          candidate.organization_id,
        ]);
        const link = (
          await c.query(
            "SELECT * FROM classroom_link WHERE token_hash=$1 AND NOT revoked AND expires_at>now() FOR UPDATE",
            [hash(value.token)],
          )
        ).rows[0];
        if (!link) throw new DomainError("ROOM_LINK_INVALID", 404);
        const room = (
          await c.query(
            "SELECT state,locked FROM meeting_room WHERE organization_id=$1 AND id=$2 FOR SHARE",
            [link.organization_id, link.room_id],
          )
        ).rows[0];
        if (!room || room.state !== "open" || room.locked)
          throw new DomainError("ROOM_NOT_OPEN", 409);
        const existing = (
          await c.query(
            "SELECT id,status FROM membership WHERE organization_id=$1 AND user_id=$2 FOR SHARE",
            [link.organization_id, who.userId],
          )
        ).rows[0];
        if (existing?.status === "suspended")
          throw new DomainError("MEMBERSHIP_REVOKED");
        const membershipId = existing?.id ?? randomUUID();
        if (!existing)
          await c.query(
            "INSERT INTO membership(id,organization_id,user_id,role) VALUES($1,$2,$3,'member')",
            [membershipId, link.organization_id, who.userId],
          );
        const assigned = (
          await c.query(
            "SELECT banned,admitted FROM room_assignment WHERE organization_id=$1 AND room_id=$2 AND membership_id=$3 FOR UPDATE",
            [link.organization_id, link.room_id, membershipId],
          )
        ).rows[0];
        if (assigned?.banned) throw new DomainError("ROOM_ACCESS_DENIED");
        if (!assigned?.admitted) {
          if (link.uses >= link.max_uses)
            throw new DomainError("ROOM_LINK_FULL", 409);
          await c.query(
            "INSERT INTO room_assignment(id,organization_id,room_id,membership_id,role,admitted) VALUES($1,$2,$3,$4,'attendee',true) ON CONFLICT(organization_id,room_id,membership_id) DO UPDATE SET admitted=true",
            [randomUUID(), link.organization_id, link.room_id, membershipId],
          );
          await c.query("UPDATE classroom_link SET uses=uses+1 WHERE id=$1", [
            link.id,
          ]);
          await c.query(
            "INSERT INTO audit_event(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'room.link.accept',$4)",
            [randomUUID(), link.organization_id, who.userId, link.id],
          );
        }
        await c.query(
          "UPDATE auth_session SET active_organization_id=$1 WHERE id=$2 AND user_id=$3",
          [link.organization_id, who.sessionId, who.userId],
        );
        return { roomId: link.room_id };
      });
    },
  };
}
