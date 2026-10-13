import { z } from "zod";

export const ticketDraftSchema = z.object({
  version: z.literal(1),
  subject: z
    .string()
    .trim()
    .min(5, "موضوع باید حداقل ۵ نویسه داشته باشد.")
    .max(120, "موضوع حداکثر ۱۲۰ نویسه است."),
  category: z.enum(["technical", "account", "feedback"]),
  priority: z.enum(["normal", "urgent"]),
  description: z
    .string()
    .trim()
    .min(20, "جزئیات باید حداقل ۲۰ نویسه داشته باشد.")
    .max(4000, "جزئیات حداکثر ۴۰۰۰ نویسه است."),
});
export type TicketDraft = z.infer<typeof ticketDraftSchema>;
export const draftStorageKey = "hamyar.support-draft.v1";

export function readDraft(raw: string | null): TicketDraft | null {
  if (!raw || raw.length > 20000) return null;
  try {
    const parsed = ticketDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
