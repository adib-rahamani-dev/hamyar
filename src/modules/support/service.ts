import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import type { Identity } from "../identity/auth";
import { createTenancy, DomainError } from "../tenancy/service";
/** Tickets are private to the organization. Members see their own; managers can answer.
 * This is an internal organization inbox, not an unimplemented email to platform staff.
 */
export function createSupport(pool: Pool, auth: Identity) {
  const tenancy = createTenancy(pool, auth);
  return {
    async list(headers: Headers) {
      return tenancy.inOrganization(headers, false, async (c, a) => {
        const tickets = (
          await c.query(
            'SELECT t.id,t.title,t.body,t.priority,t.status,t.created_at AS "createdAt",u.name FROM support_ticket t JOIN auth_user u ON u.id=t.user_id WHERE t.organization_id=$1 AND ($3 OR t.user_id=$2) ORDER BY t.updated_at DESC LIMIT 50',
            [a.organizationId, a.userId, a.role !== "member"],
          )
        ).rows;
        const replies = (
          await c.query(
            'SELECT r.id,r.ticket_id AS "ticketId",r.body,u.name,r.created_at AS "createdAt" FROM support_reply r JOIN support_ticket t ON t.organization_id=r.organization_id AND t.id=r.ticket_id JOIN auth_user u ON u.id=r.user_id WHERE r.organization_id=$1 AND ($3 OR t.user_id=$2) ORDER BY r.created_at DESC LIMIT 300',
            [a.organizationId, a.userId, a.role !== "member"],
          )
        ).rows;
        return { tickets, replies, manager: a.role !== "member" };
      });
    },
    async create(headers: Headers, input: unknown) {
      const v = z
        .object({
          title: z.string().trim().min(3).max(120),
          body: z.string().trim().min(5).max(2000),
          priority: z.enum(["normal", "high"]),
        })
        .strict()
        .parse(input);
      return tenancy.inOrganization(headers, false, async (c, a) => {
        const id = randomUUID();
        await c.query(
          "INSERT INTO support_ticket(id,organization_id,user_id,title,body,priority) VALUES($1,$2,$3,$4,$5,$6)",
          [id, a.organizationId, a.userId, v.title, v.body, v.priority],
        );
        return { id };
      });
    },
    async reply(headers: Headers, id: string, input: unknown) {
      z.uuid().parse(id);
      const v = z
        .object({
          body: z.string().trim().min(1).max(2000),
          close: z.boolean().optional(),
        })
        .strict()
        .parse(input);
      return tenancy.inOrganization(headers, false, async (c, a) => {
        const ticket = (
          await c.query(
            "SELECT user_id,status FROM support_ticket WHERE organization_id=$1 AND id=$2 FOR UPDATE",
            [a.organizationId, id],
          )
        ).rows[0];
        if (!ticket || (a.role === "member" && ticket.user_id !== a.userId))
          throw new DomainError("NOT_FOUND", 404);
        if (ticket.status === "closed")
          throw new DomainError("TICKET_CLOSED", 409);
        if (v.close && a.role === "member")
          throw new DomainError("MANAGER_REQUIRED");
        await c.query(
          "INSERT INTO support_reply(id,organization_id,ticket_id,user_id,body) VALUES($1,$2,$3,$4,$5)",
          [randomUUID(), a.organizationId, id, a.userId, v.body],
        );
        await c.query(
          "UPDATE support_ticket SET status=$3,updated_at=now() WHERE organization_id=$1 AND id=$2",
          [
            a.organizationId,
            id,
            v.close ? "closed" : a.role !== "member" ? "answered" : "open",
          ],
        );
        return { saved: true };
      });
    },
  };
}
