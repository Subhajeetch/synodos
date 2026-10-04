import { z } from "zod";
import { documentRoleSchema, type DocumentRole } from "./roles";

export const documentIdParamSchema = z.object({ id: z.uuid() });

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).default("Untitled"),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
});
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const addMemberSchema = z.object({
  email: z.email(),
  role: documentRoleSchema.exclude(["owner"]),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export type DocumentSummary = {
  id: string;
  title: string;
  role: DocumentRole;
  updatedAt: string;
};
