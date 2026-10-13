import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Redis } from "@hocuspocus/extension-redis";
import { Redis as RedisClient } from "ioredis";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import * as Y from "yjs";
import {
  createDocumentVersion,
  createDb,
  documents,
  eq,
  findLatestDocumentVersion,
  getDocumentRole,
  getDocumentVersionState,
  loadDocumentState,
  pruneDocumentVersions,
  saveDocumentState,
} from "@synodos/db";
import { canEdit, USER_EVENTS_ROOM_PREFIX } from "@synodos/shared";
import { redisConfigFromUrl } from "./redis-config";
import { listenForAccessChanges } from "./access-listener";
import { listenForVersionRestores } from "./version-restore-listener";

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    PORT: z.coerce.number().optional(),
    COLLAB_PORT: z.coerce.number().optional(),
  })
  .parse(process.env);

const port = env.COLLAB_PORT ?? env.PORT ?? 1234;

const { db } = createDb(env.DATABASE_URL);
const versionRedis = new RedisClient(env.REDIS_URL, { maxRetriesPerRequest: 2 });
versionRedis.on("error", (error) =>
  console.error("[versions] Redis lock error:", error.message),
);
const JWKS = createRemoteJWKSet(new URL("/api/auth/jwks", env.BETTER_AUTH_URL));
const AUTO_VERSION_INTERVAL_MS = 10 * 60 * 1000;
const MAX_VERSION_SIZE_BYTES = 10 * 1024 * 1024;

function contextUserId(context: unknown): string | null {
  if (!context || typeof context !== "object" || !("userId" in context)) {
    return null;
  }
  return typeof context.userId === "string" ? context.userId : null;
}

async function createAutoVersion(
  documentId: string,
  state: Uint8Array,
  force: boolean,
) {
  await withDocumentVersionLock(documentId, async () => {
    const changesKey = `synodos:document-version-changes:${documentId}`;
    const changes = await versionRedis.hgetall(changesKey);
    if (!changes._dirty) return;
    const sizeBytes = state.byteLength;
    if (sizeBytes > MAX_VERSION_SIZE_BYTES) {
      console.warn(
        JSON.stringify({
          event: "document_version_failed",
          documentId,
          reason: "snapshot_too_large",
          sizeBytes,
        }),
      );
      return;
    }

    const contentHash = createHash("sha256").update(state).digest("hex");
    const latest = await findLatestDocumentVersion(db, documentId);
    const legacyState =
      latest && latest.contentHash.length !== 64
        ? await getDocumentVersionState(db, documentId, latest.id)
        : null;
    const latestMatches =
      latest?.contentHash === contentHash ||
      (legacyState !== null &&
        createHash("sha256").update(legacyState).digest("hex") === contentHash);
    if (latestMatches) {
      await clearCapturedChanges(changesKey, changes);
      console.info(
        JSON.stringify({
          event: "document_version_skipped",
          documentId,
          reason: "unchanged",
        }),
      );
      return;
    }

    const latestAuto = await findLatestDocumentVersion(db, documentId, "auto");
    if (
      !force &&
      latestAuto &&
      Date.now() - latestAuto.createdAt.getTime() < AUTO_VERSION_INTERVAL_MS
    ) {
      return;
    }

    const contributors = Object.keys(changes)
      .filter((key) => key.startsWith("user:"))
      .map((key) => key.slice("user:".length))
      .sort();
    const created = await createDocumentVersion(db, {
      documentId,
      state,
      contentHash,
      kind: "auto",
      createdBy: changes._author ?? contributors[0] ?? null,
      contributors,
    });
    if (!created) return;
    await clearCapturedChanges(changesKey, changes);
    console.info(
      JSON.stringify({
        event: "document_version_created",
        documentId,
        versionId: created.id,
        kind: "auto",
        sizeBytes,
      }),
    );
    try {
      const pruned = await pruneDocumentVersions(db, documentId);
      if (pruned > 0) {
        console.info(
          JSON.stringify({
            event: "document_versions_pruned",
            documentId,
            count: pruned,
          }),
        );
      }
    } catch (error) {
      console.error(
        "[versions] retention pruning failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  });
}

async function clearCapturedChanges(
  key: string,
  captured: Record<string, string>,
) {
  const fields = Object.entries(captured).flatMap(([field, value]) => [
    field,
    value,
  ]);
  if (fields.length === 0) return;
  await versionRedis.eval(
    `if redis.call('HGET', KEYS[1], '_dirty') == ARGV[1] then
      for i = 1, #ARGV, 2 do
        local field = ARGV[i]
        local expected = ARGV[i + 1]
        if redis.call('HGET', KEYS[1], field) == expected then
          redis.call('HDEL', KEYS[1], field)
        end
      end
    end
    return 1`,
    1,
    key,
    ...fields,
  );
}

async function withDocumentVersionLock(
  documentId: string,
  operation: () => Promise<void>,
) {
  const key = `synodos:document-version-lock:${documentId}`;
  const token = randomUUID();
  let acquired = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((await versionRedis.set(key, token, "PX", 30_000, "NX")) === "OK") {
      acquired = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!acquired) throw new Error("Could not acquire document version lock");
  try {
    await operation();
  } finally {
    await versionRedis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      key,
      token,
    );
  }
}

const server = new Server({
  name: `synodos-collab-${port}`,
  port,
  timeout: 120_000, // Allow background tabs more time before expiring a quiet socket.
  debounce: 2_000, // store 2s after the last change...
  maxDebounce: 10_000, // ...but never wait longer than 10s during continuous typing

  extensions: [

    new Redis({ ...redisConfigFromUrl(env.REDIS_URL), prefix: "synodos" }),

    new Database({
      fetch: async ({ documentName }) =>
        documentName.startsWith(USER_EVENTS_ROOM_PREFIX)
          ? null
          : loadDocumentState(db, documentName),

      store: async ({ documentName, state }) => {
        if (documentName.startsWith(USER_EVENTS_ROOM_PREFIX)) return;

        const touched = await db
          .update(documents)
          .set({ updatedAt: new Date() })
          .where(eq(documents.id, documentName))
          .returning({ id: documents.id });
        if (touched.length === 0) return;

        await saveDocumentState(db, documentName, state);
        try {
          await createAutoVersion(documentName, state, false);
        } catch (error) {
          console.error(
            "[versions] automatic checkpoint failed:",
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      },
    }),
  ],

  async onChange({ documentName, context, connection }) {
    if (documentName.startsWith(USER_EVENTS_ROOM_PREFIX)) return;
    const userId = contextUserId(connection?.context ?? context);
    const changesKey = `synodos:document-version-changes:${documentName}`;
    const changeId = randomUUID();
    try {
      if (userId) await versionRedis.hsetnx(changesKey, "_author", userId);
      await versionRedis.hset(changesKey, "_dirty", changeId);
      if (userId) {
        await versionRedis.hset(changesKey, `user:${userId}`, changeId);
      }
      await versionRedis.expire(changesKey, 31 * 24 * 60 * 60);
    } catch (error) {
      console.error(
        "[versions] could not track snapshot contributors:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  },

  async onDisconnect({ documentName, clientsCount, document }) {
    if (documentName.startsWith(USER_EVENTS_ROOM_PREFIX) || clientsCount !== 0) {
      return;
    }
    try {
      await createAutoVersion(
        documentName,
        Y.encodeStateAsUpdate(document),
        true,
      );
    } catch (error) {
      console.error(
        "[versions] final checkpoint failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  },

  async onAuthenticate({ token, documentName, connectionConfig }) {
    if (!token) throw new Error("Unauthorized");

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: env.BETTER_AUTH_URL,
        audience: env.BETTER_AUTH_URL,
      });
      if (!payload.sub) throw new Error("Missing subject");
      userId = payload.sub;
    } catch (error) {
      console.error(
        "[auth] collaboration token verification failed:",
        error instanceof Error ? error.message : "Unknown verification error",
      );
      throw new Error("Unauthorized");
    }

    if (documentName.startsWith(USER_EVENTS_ROOM_PREFIX)) {
      if (documentName !== `${USER_EVENTS_ROOM_PREFIX}${userId}`) {
        throw new Error("Forbidden");
      }
      connectionConfig.readOnly = true;
      return { userId, role: "viewer" };
    }

    if (!z.uuid().safeParse(documentName).success) {
      throw new Error("Invalid document");
    }

    const role = await getDocumentRole(db, userId, documentName);
    if (!role) throw new Error("Forbidden");

    if (!canEdit(role)) connectionConfig.readOnly = true;

    return { userId, role };
  },
});

await server.listen();

const stopListening = listenForAccessChanges(server.hocuspocus, env.REDIS_URL);
const stopVersionRestoreListener = listenForVersionRestores(
  server.hocuspocus,
  env.REDIS_URL,
  env.DATABASE_URL,
);

async function shutdown(signal: string) {
  console.log(`${signal} received, flushing pending stores…`);
  await stopListening();
  await stopVersionRestoreListener();
  server.hocuspocus.flushPendingStores();
  await server.destroy();
  await versionRedis.quit();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));