import { z } from "zod";
export const strokeSchema = z
  .object({
    id: z.uuid(),
    color: z.enum(["emerald", "ink", "violet"]),
    width: z.union([z.literal(2), z.literal(4), z.literal(8)]),
    points: z
      .array(
        z.tuple([
          z.number().int().min(0).max(1000),
          z.number().int().min(0).max(640),
        ]),
      )
      .min(2)
      .max(120),
  })
  .strict();
export type Stroke = z.infer<typeof strokeSchema> & { author: string };
export const boardCommand = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), stroke: strokeSchema }).strict(),
  z
    .object({
      action: z.enum(["clear", "undo"]),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
]);
export const messageInput = z
  .object({ clientId: z.uuid(), body: z.string().trim().min(1).max(2000) })
  .strict();
export const memberCommand = z
  .object({
    membershipId: z.uuid(),
    action: z.enum(["allow", "revoke", "ban", "admit"]),
  })
  .strict();
