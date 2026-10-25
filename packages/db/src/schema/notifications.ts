import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { documents } from "./documents";
import { user } from "./auth";

export const notificationType = pgEnum("notification_type", [
  "document_invitation_received",
  "document_invitation_revoked",
  "document_deleted",
  "document_invitation_accepted",
  "document_access_granted",
  "document_join_request_received",
  "document_join_request_approved",
  "document_join_request_rejected",
  "document_member_added",
  "document_member_removed",
  "document_role_changed",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    type: notificationType("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
  ],
);
