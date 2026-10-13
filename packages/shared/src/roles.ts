import { z } from "zod";

export const DOCUMENT_ROLES = ["owner", "editor", "viewer"] as const;

export const documentRoleSchema = z.enum(DOCUMENT_ROLES);
export type DocumentRole = z.infer<typeof documentRoleSchema>;

export const canEdit = (role: DocumentRole | null): boolean =>
  role === "owner" || role === "editor";

export const canManageMembers = (role: DocumentRole | null): boolean =>
  role === "owner";

export const canCreateVersions = (role: DocumentRole | null): boolean =>
  role === "owner" || role === "editor";

export const canRestoreVersions = (role: DocumentRole | null): boolean =>
  role === "owner";
