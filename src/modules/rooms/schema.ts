import {
  pgTable,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { organization, membership } from "../tenancy/schema";
import { user } from "../identity/schema";
export const meetingRoom = pgTable(
  "meeting_room",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    title: text("title").notNull(),
    state: text("state", { enum: ["scheduled", "open", "ended"] })
      .notNull()
      .default("scheduled"),
    locked: boolean("locked").notNull().default(false),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("meeting_room_org_id_idx").on(t.organizationId, t.id),
    index("meeting_room_tenant_created_idx").on(t.organizationId, t.createdAt),
  ],
);
export const roomAssignment = pgTable(
  "room_assignment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    roomId: text("room_id").notNull(),
    membershipId: text("membership_id").notNull(),
    role: text("role", { enum: ["host", "presenter", "attendee"] }).notNull(),
    admitted: boolean("admitted").notNull().default(false),
    banned: boolean("banned").notNull().default(false),
  },
  (t) => [
    uniqueIndex("room_assignment_org_room_member_idx").on(
      t.organizationId,
      t.roomId,
      t.membershipId,
    ),
    index("room_assignment_membership_idx").on(
      t.organizationId,
      t.membershipId,
      t.roomId,
    ),
    foreignKey({
      columns: [t.organizationId, t.roomId],
      foreignColumns: [meetingRoom.organizationId, meetingRoom.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.membershipId],
      foreignColumns: [membership.organizationId, membership.id],
    }),
  ],
);
