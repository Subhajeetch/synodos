import { z } from "zod";

export const ACCESS_CHANNEL = "synodos-events:access-changed";
export const NOTIFICATION_CHANNEL = "synodos-events:notification-created";
export const USER_EVENTS_ROOM_PREFIX = "user:";

export const accessChangedSchema = z.object({
  documentId: z.uuid(),
  userId: z.string().min(1).nullable(), // null = everyone (document deleted)
  reason: z.enum(["member-removed", "role-changed"]).optional(),
  role: z.enum(["editor", "viewer"]).optional(),
});
export const accessChangedEventSchema = accessChangedSchema.refine(
  (event) => event.reason !== "role-changed" || event.role !== undefined,
  { message: "A role is required for role-changed access events" },
);
export type AccessChanged = z.infer<typeof accessChangedEventSchema>;

export const memberRemovedMessageSchema = z.object({
  type: z.literal("member-removed"),
  userId: z.string().min(1),
});

export const memberRoleChangedMessageSchema = z.object({
  type: z.literal("member-role-changed"),
  userId: z.string().min(1),
  role: z.enum(["editor", "viewer"]),
});

export const documentDeletedMessageSchema = z.object({
  type: z.literal("document-deleted"),
  documentId: z.uuid(),
});

export const documentRestoredMessageSchema = z.object({
  type: z.literal("document-restored"),
  actorName: z.string().min(1),
});

export const notificationCreatedMessageSchema = z.object({
  type: z.literal("notification-created"),
  notificationId: z.uuid(),
});
export const notificationPublishedEventSchema = notificationCreatedMessageSchema
  .omit({ type: true })
  .extend({ userId: z.string().min(1) });
