import { Redis } from "ioredis";
import type { Hocuspocus } from "@hocuspocus/server";
import * as Y from "yjs";
import { createHash } from "node:crypto";
import {
  createDb,
  createDocumentVersion,
  eq,
  getDocumentRole,
  getDocumentVersion,
  getDocumentVersionByOperationId,
  saveDocumentState,
  schema,
} from "@synodos/db";
import {
  VERSION_RESTORE_REQUEST_CHANNEL,
  VERSION_RESTORE_RESULT_PREFIX,
  VERSION_CHECKPOINT_REQUEST_CHANNEL,
  VERSION_CHECKPOINT_RESULT_PREFIX,
  VERSION_RESTORED_CHANNEL,
  canCreateVersions,
  canRestoreVersions,
  versionCheckpointRequestSchema,
  versionRestoredEventSchema,
  versionRestoreRequestSchema,
} from "@synodos/shared";

const MAX_VERSION_SIZE_BYTES = 10 * 1024 * 1024;

async function acquireDocumentVersionLock(
  redis: Redis,
  documentId: string,
  operationId: string,
) {
  const key = `synodos:document-version-lock:${documentId}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((await redis.set(key, operationId, "PX", 30_000, "NX")) === "OK") {
      return key;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

export function listenForVersionRestores(
  hocuspocus: Hocuspocus,
  redisUrl: string,
  databaseUrl: string,
) {
  const subscriber = new Redis(redisUrl);
  const publisher = new Redis(redisUrl);
  const { db, pool } = createDb(databaseUrl);
  const { user } = schema;

  subscriber.on("error", (error) =>
    console.error("[versions] restore subscriber error:", error.message),
  );
  publisher.on("error", (error) =>
    console.error("[versions] restore publisher error:", error.message),
  );
  void subscriber.subscribe(VERSION_RESTORE_REQUEST_CHANNEL).catch((error) => {
    console.error("[versions] restore subscription failed:", error.message);
  });
  void subscriber
    .subscribe(VERSION_CHECKPOINT_REQUEST_CHANNEL)
    .catch((error) => {
      console.error(
        "[versions] checkpoint subscription failed:",
        error.message,
      );
    });
  void subscriber.subscribe(VERSION_RESTORED_CHANNEL).catch((error) => {
    console.error(
      "[versions] restore notification subscription failed:",
      error.message,
    );
  });

  subscriber.on("message", (channel, raw) => {
    if (channel === VERSION_RESTORED_CHANNEL) {
      const event = versionRestoredEventSchema.safeParse(safeJson(raw));
      if (!event.success) return;
      hocuspocus.documents.get(event.data.documentId)?.broadcastStateless(
        JSON.stringify({
          type: "document-restored",
          actorName: event.data.actorName,
        }),
      );
      return;
    }
    if (channel === VERSION_CHECKPOINT_REQUEST_CHANNEL) {
      void handleCheckpoint(raw).catch((error: unknown) => {
        console.error(
          "[versions] named checkpoint failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
      });
      return;
    }
    if (channel !== VERSION_RESTORE_REQUEST_CHANNEL) return;
    void handleMessage(raw).catch((error: unknown) => {
      console.error(
        "[versions] restore request failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    });
  });

  async function handleCheckpoint(raw: string) {
    const parsed = versionCheckpointRequestSchema.safeParse(safeJson(raw));
    if (!parsed.success) return;
    const request = parsed.data;
    const document = hocuspocus.documents.get(request.documentId);
    if (!document) {
      await publisher.publish(
        `${VERSION_CHECKPOINT_RESULT_PREFIX}${request.operationId}`,
        JSON.stringify({
          operationId: request.operationId,
          documentId: request.documentId,
          status: "failed",
          reason: "not-loaded",
        }),
      );
      return;
    }

    const previous = await getDocumentVersionByOperationId(
      db,
      request.documentId,
      request.operationId,
    );
    const channel = `${VERSION_CHECKPOINT_RESULT_PREFIX}${request.operationId}`;
    const respond = async (
      status: "created" | "failed",
      options: {
        versionId?: string;
        reason?: "not-loaded" | "not-editor" | "too-large" | "failed";
      } = {},
    ) =>
      publisher.publish(
        channel,
        JSON.stringify({
          operationId: request.operationId,
          documentId: request.documentId,
          status,
          ...options,
        }),
      );
    if (previous) {
      await respond("created", { versionId: previous.id });
      return;
    }

    const lockKey = await acquireDocumentVersionLock(
      publisher,
      request.documentId,
      request.operationId,
    );
    if (!lockKey) return;
    try {
      const existing = await getDocumentVersionByOperationId(
        db,
        request.documentId,
        request.operationId,
      );
      if (existing) {
        await respond("created", { versionId: existing.id });
        return;
      }
      const role = await getDocumentRole(
        db,
        request.actorId,
        request.documentId,
      );
      if (!canCreateVersions(role)) {
        await respond("failed", { reason: "not-editor" });
        return;
      }
      const state = Y.encodeStateAsUpdate(document);
      if (state.byteLength > MAX_VERSION_SIZE_BYTES) {
        await respond("failed", { reason: "too-large" });
        return;
      }
      const contentHash = createHash("sha256").update(state).digest("hex");
      const created = await createDocumentVersion(db, {
        documentId: request.documentId,
        state,
        contentHash,
        label: request.label,
        kind: "named",
        createdBy: request.actorId,
        contributors: [request.actorId],
        operationId: request.operationId,
      });
      if (!created) {
        await respond("failed", { reason: "failed" });
        return;
      }
      console.info(
        JSON.stringify({
          event: "document_version_created",
          documentId: request.documentId,
          versionId: created.id,
          kind: "named",
          sizeBytes: state.byteLength,
        }),
      );
      await respond("created", { versionId: created.id });
    } catch (error) {
      console.error(
        "[versions] named checkpoint failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      await respond("failed", { reason: "failed" });
    } finally {
      await publisher.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        lockKey,
        request.operationId,
      );
    }
  }

  async function handleMessage(raw: string) {
    const parsed = versionRestoreRequestSchema.safeParse(safeJson(raw));
    if (!parsed.success) return;
    const request = parsed.data;
    const document = hocuspocus.documents.get(request.documentId);
    if (!document) {
      await publisher.publish(
        `${VERSION_RESTORE_RESULT_PREFIX}${request.operationId}`,
        JSON.stringify({
          operationId: request.operationId,
          documentId: request.documentId,
          status: "failed",
          reason: "not-loaded",
        }),
      );
      return;
    }

    const lockKey = await acquireDocumentVersionLock(
      publisher,
      request.documentId,
      request.operationId,
    );
    if (!lockKey) return;

    const channel = `${VERSION_RESTORE_RESULT_PREFIX}${request.operationId}`;
    const respond = async (
      status: "restored" | "already-restored" | "failed",
      options: {
        versionId?: string;
        reason?:
          | "not-loaded"
          | "not-owner"
          | "version-not-found"
          | "document-changed"
          | "failed";
      } = {},
    ) => {
      await publisher.publish(
        channel,
        JSON.stringify({
          operationId: request.operationId,
          documentId: request.documentId,
          status,
          ...options,
        }),
      );
    };

    try {
      const previous = await getDocumentVersionByOperationId(
        db,
        request.documentId,
        request.operationId,
      );
      if (previous) {
        await respond("already-restored", { versionId: previous.id });
        return;
      }

      const role = await getDocumentRole(
        db,
        request.actorId,
        request.documentId,
      );
      if (!canRestoreVersions(role)) {
        await respond("failed", { reason: "not-owner" });
        return;
      }
      const target = await getDocumentVersion(
        db,
        request.documentId,
        request.versionId,
      );
      if (!target) {
        await respond("failed", { reason: "version-not-found" });
        return;
      }
      if (target.sizeBytes > MAX_VERSION_SIZE_BYTES) {
        await respond("failed", { reason: "failed" });
        return;
      }

      const currentState = Y.encodeStateAsUpdate(document);
      const currentHash = createHash("sha256")
        .update(currentState)
        .digest("hex");
      const currentSize = currentState.byteLength;
      if (currentSize > MAX_VERSION_SIZE_BYTES) {
        await respond("failed", { reason: "failed" });
        return;
      }
      const beforeRestore = await createDocumentVersion(db, {
        documentId: request.documentId,
        state: currentState,
        contentHash: currentHash,
        kind: "pre_restore",
        createdBy: request.actorId,
        contributors: [request.actorId],
      });
      if (!beforeRestore) {
        throw new Error("Pre-restore version could not be saved");
      }

      await saveDocumentState(db, request.documentId, currentState);
      const latestLiveState = Y.encodeStateAsUpdate(document);
      const latestLiveHash = createHash("sha256")
        .update(latestLiveState)
        .digest("hex");
      if (latestLiveHash !== currentHash) {
        await respond("failed", { reason: "document-changed" });
        return;
      }

      const snapshot = new Y.Doc();
      Y.applyUpdate(snapshot, target.state);
      replaceDocumentState(document, snapshot);
      snapshot.destroy();

      const restoredState = Y.encodeStateAsUpdate(document);
      const restoredHash = createHash("sha256")
        .update(restoredState)
        .digest("hex");
      const [actor] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, request.actorId))
        .limit(1);
      const restoreVersion = await createDocumentVersion(db, {
        documentId: request.documentId,
        state: restoredState,
        contentHash: restoredHash,
        kind: "restore",
        createdBy: request.actorId,
        contributors: [request.actorId],
        restoredFromVersionId: request.versionId,
        operationId: request.operationId,
      });
      await saveDocumentState(db, request.documentId, restoredState);
      if (!restoreVersion) {
        throw new Error("Restore version could not be saved");
      }
      await publisher.publish(
        VERSION_RESTORED_CHANNEL,
        JSON.stringify({
          documentId: request.documentId,
          actorName: actor?.name ?? "The document owner",
        }),
      );
      await respond("restored", { versionId: restoreVersion.id });
    } catch (error) {
      console.error(
        "[versions] live restore failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      await respond("failed", { reason: "failed" });
    } finally {
      await publisher.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        lockKey,
        request.operationId,
      );
    }
  }

  return async () => {
    await Promise.all([subscriber.quit(), publisher.quit()]);
    await pool.end();
  };
}

export function replaceDocumentState(target: Y.Doc, snapshot: Y.Doc) {
  // 1. Force Yjs to instantiate the concrete shared types on both docs first
  const targetDefault = target.getXmlFragment("default");
  const snapshotDefault = snapshot.getXmlFragment("default");

  const targetPageMeta = target.getMap<string>("pageMetadata");
  const snapshotPageMeta = snapshot.getMap<string>("pageMetadata");

  const targetMigrations = target.getMap<boolean>("editorMigrations");
  const snapshotMigrations = snapshot.getMap<boolean>("editorMigrations");

  target.transact(() => {
    // 2. Replace the main Tiptap XML fragment
    if (targetDefault.length) targetDefault.delete(0, targetDefault.length);
    targetDefault.insert(
      0,
      snapshotDefault
        .toArray()
        .filter(
          (item): item is Y.XmlElement | Y.XmlText =>
            item instanceof Y.XmlElement || item instanceof Y.XmlText,
        )
        .map((item) => item.clone()),
    );

    // 3. Replace pageMetadata map
    for (const key of [...targetPageMeta.keys()]) targetPageMeta.delete(key);
    for (const [key, value] of snapshotPageMeta.entries()) {
      if (!((value as unknown) instanceof Y.AbstractType)) {
        targetPageMeta.set(key, structuredClone(value));
      }
    }

    // 4. Replace editorMigrations map
    for (const key of [...targetMigrations.keys()])
      targetMigrations.delete(key);
    for (const [key, value] of snapshotMigrations.entries()) {
      if (!((value as unknown) instanceof Y.AbstractType)) {
        targetMigrations.set(key, structuredClone(value));
      }
    }
  }, "version-restore");
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
