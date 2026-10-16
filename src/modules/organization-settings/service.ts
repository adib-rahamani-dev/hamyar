import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import type { Identity } from "../identity/auth";
import { createTenancy } from "../tenancy/service";
const brandSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    tone: z.enum(["emerald", "ocean", "violet"]),
    welcome: z.string().trim().max(240),
  })
  .strict();
/** Preset tones are intentional: tenants cannot inject HTML, CSS or scripts. */
export function createOrganizationSettings(pool: Pool, auth: Identity) {
  const tenancy = createTenancy(pool, auth);
  return {
    async read(headers: Headers) {
      return tenancy.inOrganization(headers, false, async (c, a) => ({
        ...(
          await c.query(
            "SELECT COALESCE(b.display_name,o.name) AS \"displayName\",COALESCE(b.tone,'emerald') AS tone,COALESCE(b.welcome,'') AS welcome FROM organization o LEFT JOIN organization_brand b ON b.organization_id=o.id WHERE o.id=$1",
            [a.organizationId],
          )
        ).rows[0],
        canEdit: a.role !== "member",
      }));
    },
    async update(headers: Headers, input: unknown) {
      const v = brandSchema.parse(input);
      return tenancy.inOrganization(headers, true, async (c, a) => {
        await c.query(
          "INSERT INTO organization_brand(organization_id,display_name,tone,welcome) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id) DO UPDATE SET display_name=$2,tone=$3,welcome=$4,updated_at=now()",
          [a.organizationId, v.displayName, v.tone, v.welcome],
        );
        await c.query(
          "INSERT INTO audit_event(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'brand.update',$2)",
          [randomUUID(), a.organizationId, a.userId],
        );
        return { saved: true };
      });
    },
  };
}
