import { z } from "zod";
import { documentRoleSchema, type DocumentRole } from "./roles";

export const MAX_DOCUMENT_MEMBERS = 10; // includes the owner

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

export const updateMemberRoleSchema = z.object({
  role: documentRoleSchema.exclude(["owner"]),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export type DocumentMember = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: DocumentRole;
};

export type UserSearchItem = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type DocumentSummary = {
  id: string;
  title: string;
  role: DocumentRole;
  updatedAt: string;
};

