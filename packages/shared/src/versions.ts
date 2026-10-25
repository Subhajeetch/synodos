import { z } from "zod";

export const VERSION_KINDS = [
  "auto",
  "named",
  "restore",
  "pre_restore",
] as const;
export const VERSION_RESTORE_REQUEST_CHANNEL =
  "synodos-events:version-restore-request";
export const VERSION_RESTORE_RESULT_PREFIX =
  "synodos-events:version-restore-result:";
export const VERSION_CHECKPOINT_REQUEST_CHANNEL =
  "synodos-events:version-checkpoint-request";
export const VERSION_CHECKPOINT_RESULT_PREFIX =
  "synodos-events:version-checkpoint-result:";
export const VERSION_RESTORED_CHANNEL = "synodos-events:document-restored";
export const versionRestoredEventSchema = z.object({
  documentId: z.uuid(),
  actorName: z.string().min(1),
});
export const versionCheckpointRequestSchema = z.object({
  operationId: z.uuid(),
  documentId: z.uuid(),
  actorId: z.string().min(1),
  label: z.string().trim().min(1).max(120),
});
export const versionCheckpointResultSchema = z.object({
  operationId: z.uuid(),
  documentId: z.uuid(),
  status: z.enum(["created", "failed"]),
  versionId: z.uuid().optional(),
  reason: z
    .enum(["not-loaded", "not-editor", "too-large", "failed"])
    .optional(),
});
export const versionRestoreRequestSchema = z.object({
  operationId: z.uuid(),
  documentId: z.uuid(),
  versionId: z.uuid(),
  actorId: z.string().min(1),
});
export const versionRestoreResultSchema = z.object({
  operationId: z.uuid(),
  documentId: z.uuid(),
  status: z.enum(["restored", "already-restored", "failed"]),
  versionId: z.uuid().optional(),
  reason: z
    .enum([
      "not-loaded",
      "not-owner",
      "version-not-found",
      "document-changed",
      "failed",
    ])
    .optional(),
});

export const versionKindSchema = z.enum(VERSION_KINDS);

export const documentVersionsParamsSchema = z.object({ id: z.uuid() });
export const documentVersionParamsSchema = documentVersionsParamsSchema.extend({
  versionId: z.uuid(),
});
export const listDocumentVersionsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export const versionNeighborQuerySchema = z.object({
  direction: z.enum(["older", "newer"]),
});
export const createDocumentVersionSchema = z.object({
  label: z.string().trim().min(1).max(120),
});
export const updateDocumentVersionLabelSchema = createDocumentVersionSchema;
export const restoreDocumentVersionSchema = z.object({
  operationId: z.uuid(),
});

export type VersionKind = z.infer<typeof versionKindSchema>;
export type ListDocumentVersionsQuery = z.infer<
  typeof listDocumentVersionsQuerySchema
>;

export type DocumentVersionSummary = {
  id: string;
  documentId: string;
  label: string | null;
  kind: VersionKind;
  sizeBytes: number;
  restoredFromVersionId: string | null;
  contributorCount: number;
  createdAt: string;
  author: {
    id: string | null;
    name: string;
    image: string | null;
  };
};

export type DocumentVersionPage = {
  items: DocumentVersionSummary[];
  nextCursor: string | null;
  total: number;
};

export type DocumentVersionSnapshot = DocumentVersionSummary & {
  state: string;
  position: number;
  total: number;
};

export type CreateDocumentVersionInput = z.infer<
  typeof createDocumentVersionSchema
>;
export type UpdateDocumentVersionLabelInput = z.infer<
  typeof updateDocumentVersionLabelSchema
>;
export type RestoreDocumentVersionInput = z.infer<
  typeof restoreDocumentVersionSchema
>;
