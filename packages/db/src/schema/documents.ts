import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { DOCUMENT_ROLES } from "@synodos/shared";
import { bytea } from "./columns";
import { user } from "./auth";

export const documentRole = pgEnum("document_role", DOCUMENT_ROLES);
export const documentVersionKind = pgEnum("document_version_kind", [
  "auto",
  "named",
  "restore",
  "pre_restore",
]);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull().default("Untitled"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("documents_owner_idx").on(t.ownerId)],
);

export const documentMembers = pgTable(
  "document_members",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: documentRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.documentId, t.userId] }),
    index("document_members_user_idx").on(t.userId),
  ],
);

export const documentInvitations = pgTable(
  "document_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: documentRole("role").notNull(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("document_invitations_document_user_unique").on(
      t.documentId,
      t.userId,
    ),
    index("document_invitations_document_idx").on(t.documentId),
  ],
);

export const documentJoinRequests = pgTable(
  "document_join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("document_join_requests_document_user_unique").on(
      t.documentId,
      t.userId,
    ),
    index("document_join_requests_document_idx").on(t.documentId),
  ],
);

export const documentState = pgTable("document_state", {
  documentId: uuid("document_id")
    .primaryKey()
    .references(() => documents.id, { onDelete: "cascade" }),
  state: bytea("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    state: bytea("state").notNull(),
    label: text("label"),
    kind: documentVersionKind("kind").notNull().default("auto"),
    contentHash: text("content_hash").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    restoredFromVersionId: uuid("restored_from_version_id"),
    operationId: uuid("operation_id"),
    contributors: jsonb("contributors").$type<string[]>().notNull().default([]),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("document_versions_doc_idx").on(t.documentId, t.createdAt),
    index("document_versions_cursor_idx").on(
      t.documentId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    index("document_versions_hash_idx").on(
      t.documentId,
      t.contentHash,
      t.createdAt.desc(),
    ),
    index("document_versions_restored_from_idx").on(t.restoredFromVersionId),
    unique("document_versions_operation_id_unique").on(t.operationId),
  ],
);
