import { z } from "zod";

export const ACCESS_CHANNEL = "synodos-events:access-changed";

export const accessChangedSchema = z.object({
  documentId: z.uuid(),
  userId: z.string().min(1).nullable(), // null = everyone (document deleted)
});
export type AccessChanged = z.infer<typeof accessChangedSchema>;