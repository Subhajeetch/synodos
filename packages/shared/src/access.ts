import { z } from "zod";

export const ACCESS_CHANNEL = "synodos-events:access-changed";

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
