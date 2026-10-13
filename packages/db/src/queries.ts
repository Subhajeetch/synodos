import { and, asc, desc, eq, sql } from "drizzle-orm";
import type {
  DocumentRole,
  DocumentVersionSummary,
} from "@synodos/shared";
import type { Database } from "./client";
import { documentMembers, documentState, documentVersions, user } from "./schema";

/** The user's role on a document, or null if they have no access. */
export async function getDocumentRole(
  db: Database,
  userId: string,
  documentId: string,
): Promise<DocumentRole | null> {
  const [row] = await db
    .select({ role: documentMembers.role })
    .from(documentMembers)
    .where(and(eq(documentMembers.documentId, documentId), eq(documentMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

export async function loadDocumentState(
  db: Database,
  documentId: string,
): Promise<Uint8Array | null> {
  const [row] = await db
    .select({ state: documentState.state })
    .from(documentState)
    .where(eq(documentState.documentId, documentId))
    .limit(1);
  return row?.state ?? null;
}

export async function saveDocumentState(
  db: Database,
  documentId: string,
  state: Uint8Array,
): Promise<void> {
  const buf = Buffer.from(state);
  await db
    .insert(documentState)
    .values({ documentId, state: buf })
    .onConflictDoUpdate({
      target: documentState.documentId,
      set: { state: buf, updatedAt: new Date() },
    });
}

type CreateVersionInput = {
  documentId: string;
  state: Uint8Array;
  contentHash: string;
  label?: string | null;
  kind?: "auto" | "named" | "restore" | "pre_restore";
  createdBy?: string | null;
  contributors?: string[];
  restoredFromVersionId?: string | null;
  operationId?: string | null;
};

export async function createDocumentVersion(
  db: Database,
  input: CreateVersionInput,
) {
  const [row] = await db
    .insert(documentVersions)
    .values({
      documentId: input.documentId,
      state: Buffer.from(input.state),
      sizeBytes: input.state.byteLength,
      contentHash: input.contentHash,
      label: input.label ?? null,
      kind: input.kind ?? "auto",
      createdBy: input.createdBy ?? null,
      contributors: input.contributors ?? [],
      restoredFromVersionId: input.restoredFromVersionId ?? null,
      operationId: input.operationId ?? null,
    })
    .returning({
      id: documentVersions.id,
      createdAt: documentVersions.createdAt,
    });
  return row ?? null;
}

export async function findLatestDocumentVersion(
  db: Database,
  documentId: string,
  kind?: "auto" | "named" | "restore" | "pre_restore",
) {
  const [row] = await db
    .select({
      id: documentVersions.id,
      contentHash: documentVersions.contentHash,
      createdAt: documentVersions.createdAt,
      kind: documentVersions.kind,
    })
    .from(documentVersions)
    .where(
      kind
        ? and(
            eq(documentVersions.documentId, documentId),
            eq(documentVersions.kind, kind),
          )
        : eq(documentVersions.documentId, documentId),
    )
    .orderBy(desc(documentVersions.createdAt), desc(documentVersions.id))
    .limit(1);
  return row ?? null;
}

export async function countDocumentVersions(
  db: Database,
  documentId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));
  return row?.count ?? 0;
}

export async function listDocumentVersions(
  db: Database,
  documentId: string,
  options: {
    cursor?: { createdAt: Date; id: string };
    limit: number;
  },
): Promise<DocumentVersionSummary[]> {
  const rows = await db
    .select({
      id: documentVersions.id,
      documentId: documentVersions.documentId,
      label: documentVersions.label,
      kind: documentVersions.kind,
      sizeBytes: documentVersions.sizeBytes,
      restoredFromVersionId: documentVersions.restoredFromVersionId,
      contributors: documentVersions.contributors,
      createdAt: documentVersions.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(documentVersions)
    .leftJoin(user, eq(user.id, documentVersions.createdBy))
    .where(
      options.cursor
        ? and(
            eq(documentVersions.documentId, documentId),
            sql`(${documentVersions.createdAt}, ${documentVersions.id}) < (${options.cursor.createdAt}, ${options.cursor.id})`,
          )
        : eq(documentVersions.documentId, documentId),
    )
    .orderBy(desc(documentVersions.createdAt), desc(documentVersions.id))
    .limit(options.limit);

  return rows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    label: row.label,
    kind: row.kind,
    sizeBytes: row.sizeBytes,
    restoredFromVersionId: row.restoredFromVersionId,
    contributorCount: row.contributors.length,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.authorId,
      name: row.authorName ?? "Synodos system",
      image: row.authorImage,
    },
  }));
}

export async function getDocumentVersion(
  db: Database,
  documentId: string,
  versionId: string,
) {
  const [row] = await db
    .select({
      id: documentVersions.id,
      documentId: documentVersions.documentId,
      state: documentVersions.state,
      label: documentVersions.label,
      kind: documentVersions.kind,
      sizeBytes: documentVersions.sizeBytes,
      restoredFromVersionId: documentVersions.restoredFromVersionId,
      contributors: documentVersions.contributors,
      createdAt: documentVersions.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(documentVersions)
    .leftJoin(user, eq(user.id, documentVersions.createdBy))
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.id, versionId),
      ),
    )
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    documentId: row.documentId,
    state: row.state,
    label: row.label,
    kind: row.kind,
    sizeBytes: row.sizeBytes,
    restoredFromVersionId: row.restoredFromVersionId,
    contributorCount: row.contributors.length,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.authorId,
      name: row.authorName ?? "Synodos system",
      image: row.authorImage,
    },
  };
}

export async function getDocumentVersionState(
  db: Database,
  documentId: string,
  versionId: string,
): Promise<Uint8Array | null> {
  const [row] = await db
    .select({ state: documentVersions.state })
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.id, versionId),
      ),
    )
    .limit(1);
  return row?.state ?? null;
}

export async function updateDocumentVersionLabel(
  db: Database,
  documentId: string,
  versionId: string,
  label: string,
) {
  const [row] = await db
    .update(documentVersions)
    .set({ label })
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.id, versionId),
      ),
    )
    .returning({ id: documentVersions.id });
  return row ?? null;
}

export async function getDocumentVersionCursor(
  db: Database,
  documentId: string,
  versionId: string,
) {
  const [row] = await db
    .select({
      id: documentVersions.id,
      createdAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.id, versionId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getDocumentVersionPosition(
  db: Database,
  documentId: string,
  versionId: string,
) {
  const cursor = await getDocumentVersionCursor(db, documentId, versionId);
  if (!cursor) return null;
  const [row] = await db
    .select({
      newer: sql<number>`count(*)::int`,
    })
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        sql`(${documentVersions.createdAt}, ${documentVersions.id}) > (${cursor.createdAt}, ${cursor.id})`,
      ),
    );
  return (row?.newer ?? 0) + 1;
}

export async function getAdjacentDocumentVersion(
  db: Database,
  documentId: string,
  versionId: string,
  direction: "older" | "newer",
): Promise<DocumentVersionSummary | null> {
  const cursor = await getDocumentVersionCursor(db, documentId, versionId);
  if (!cursor) return null;
  const newer = direction === "newer";
  const [row] = await db
    .select({
      id: documentVersions.id,
      documentId: documentVersions.documentId,
      label: documentVersions.label,
      kind: documentVersions.kind,
      sizeBytes: documentVersions.sizeBytes,
      restoredFromVersionId: documentVersions.restoredFromVersionId,
      contributors: documentVersions.contributors,
      createdAt: documentVersions.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(documentVersions)
    .leftJoin(user, eq(user.id, documentVersions.createdBy))
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        newer
          ? sql`(${documentVersions.createdAt}, ${documentVersions.id}) > (${cursor.createdAt}, ${cursor.id})`
          : sql`(${documentVersions.createdAt}, ${documentVersions.id}) < (${cursor.createdAt}, ${cursor.id})`,
      ),
    )
    .orderBy(
      newer ? asc(documentVersions.createdAt) : desc(documentVersions.createdAt),
      newer ? asc(documentVersions.id) : desc(documentVersions.id),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    documentId: row.documentId,
    label: row.label,
    kind: row.kind,
    sizeBytes: row.sizeBytes,
    restoredFromVersionId: row.restoredFromVersionId,
    contributorCount: row.contributors.length,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.authorId,
      name: row.authorName ?? "Synodos system",
      image: row.authorImage,
    },
  };
}

export async function getDocumentVersionByOperationId(
  db: Database,
  documentId: string,
  operationId: string,
) {
  const [row] = await db
    .select({
      id: documentVersions.id,
      restoredFromVersionId: documentVersions.restoredFromVersionId,
    })
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.operationId, operationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function pruneDocumentVersions(
  db: Database,
  documentId: string,
  now = new Date(),
): Promise<number> {
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT id,
        row_number() OVER (
          PARTITION BY CASE
            WHEN created_at >= ${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)}
              THEN date_trunc('hour', created_at)
            ELSE date_trunc('day', created_at)
          END
          ORDER BY created_at DESC, id DESC
        ) AS position
      FROM document_versions
      WHERE document_id = ${documentId}
        AND kind = 'auto'
        AND created_at < ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}
    ),
    removed AS (
      DELETE FROM document_versions
      WHERE document_id = ${documentId}
        AND kind = 'auto'
        AND (
          created_at < ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}
          OR id IN (SELECT id FROM ranked WHERE position > 1)
        )
      RETURNING id
    )
    SELECT count(*)::int AS count FROM removed
  `);
  return Number(result.rows[0]?.count ?? 0);
}
