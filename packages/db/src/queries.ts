import { and, eq } from "drizzle-orm";
import type { DocumentRole } from "@synodos/shared";
import type { Database } from "./client";
import { documentMembers, documentState } from "./schema";

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
