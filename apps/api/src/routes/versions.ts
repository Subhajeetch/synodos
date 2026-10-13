import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import {
  countDocumentVersions,
  getAdjacentDocumentVersion,
  eq,
  getDocumentRole,
  getDocumentVersion,
  getDocumentVersionByOperationId,
  getDocumentVersionCursor,
  getDocumentVersionPosition,
  listDocumentVersions,
  schema,
  updateDocumentVersionLabel,
} from "@synodos/db";
import {
  canCreateVersions,
  canRestoreVersions,
  createDocumentVersionSchema,
  documentVersionParamsSchema,
  documentVersionsParamsSchema,
  listDocumentVersionsQuerySchema,
  restoreDocumentVersionSchema,
  updateDocumentVersionLabelSchema,
  versionNeighborQuerySchema,
} from "@synodos/shared";
import { db } from "../db";
import { env } from "../env";
import { requireUser } from "../lib/require-user";
import {
  requestLiveVersionCheckpoint,
  requestLiveVersionRestore,
} from "../lib/version-restore";

const MAX_VERSION_SIZE_BYTES = 10 * 1024 * 1024;
const { documents } = schema;

function withoutState(
  version: NonNullable<Awaited<ReturnType<typeof getDocumentVersion>>>,
) {
  const { state: _state, ...metadata } = version;
  return metadata;
}

export const versionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireUser);

  app.get("/documents/:id/versions", async (request, reply) => {
    const { id } = documentVersionsParamsSchema.parse(request.params);
    const query = listDocumentVersionsQuerySchema.parse(request.query);
    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });

    let cursor: { createdAt: Date; id: string } | undefined;
    if (query.cursor) {
      cursor = (await getDocumentVersionCursor(db, id, query.cursor)) ?? undefined;
      if (!cursor) {
        return reply.code(400).send({
          error: "The version history cursor is no longer valid",
          code: "INVALID_VERSION_CURSOR",
        });
      }
    }

    const rows = await listDocumentVersions(db, id, {
      ...(cursor ? { cursor } : {}),
      limit: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    return {
      items,
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
      total: await countDocumentVersions(db, id),
    };
  });

  app.get("/documents/:id/versions/:versionId", async (request, reply) => {
    const { id, versionId } = documentVersionParamsSchema.parse(request.params);
    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });

    const version = await getDocumentVersion(db, id, versionId);
    if (!version) return reply.code(404).send({ error: "Not found" });
    if (version.sizeBytes > MAX_VERSION_SIZE_BYTES) {
      return reply.code(413).send({
        error: "This version is too large to preview",
        code: "VERSION_TOO_LARGE",
      });
    }
    return {
      ...withoutState(version),
      state: Buffer.from(version.state).toString("base64"),
      position: (await getDocumentVersionPosition(db, id, versionId)) ?? 1,
      total: await countDocumentVersions(db, id),
    };
  });

  app.get(
    "/documents/:id/versions/:versionId/neighbor",
    async (request, reply) => {
      const { id, versionId } = documentVersionParamsSchema.parse(request.params);
      const { direction } = versionNeighborQuerySchema.parse(request.query);
      const role = await getDocumentRole(db, request.user.id, id);
      if (!role) return reply.code(404).send({ error: "Not found" });
      const neighbor = await getAdjacentDocumentVersion(
        db,
        id,
        versionId,
        direction,
      );
      if (!neighbor) return { version: null };
      return {
        version: {
          ...neighbor,
          position:
            (await getDocumentVersionPosition(db, id, neighbor.id)) ?? 1,
          total: await countDocumentVersions(db, id),
        },
      };
    },
  );

  app.post("/documents/:id/versions", async (request, reply) => {
    const { id } = documentVersionsParamsSchema.parse(request.params);
    const body = createDocumentVersionSchema.parse(request.body);
    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });
    if (!canCreateVersions(role)) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const operationId = randomUUID();
    try {
      const result = await requestLiveVersionCheckpoint({
        operationId,
        documentId: id,
        actorId: request.user.id,
        label: body.label,
      });
      if (result.status === "timeout") {
        return reply.code(503).send({
          error: "The collaboration service is unavailable. No checkpoint was created.",
          code: "COLLABORATION_UNAVAILABLE",
        });
      }
      if (result.result.status === "failed") {
        if (result.result.reason === "not-editor") {
          return reply.code(403).send({ error: "Forbidden" });
        }
        if (result.result.reason === "too-large") {
          return reply.code(413).send({
            error: "This document is too large to checkpoint",
            code: "VERSION_TOO_LARGE",
          });
        }
        return reply.code(503).send({
          error: "The live document could not be checkpointed",
          code: "CHECKPOINT_FAILED",
        });
      }
      const version = await getDocumentVersion(
        db,
        id,
        result.result.versionId ?? "",
      );
      if (!version) throw new Error("Created checkpoint could not be loaded");
      return reply.code(201).send(withoutState(version));
    } catch (error) {
      request.log.error({ err: error, documentId: id }, "Checkpoint dispatch failed");
      return reply.code(503).send({
        error: "The collaboration service is unavailable. No checkpoint was confirmed.",
        code: "COLLABORATION_UNAVAILABLE",
      });
    }
  });

  app.patch("/documents/:id/versions/:versionId", async (request, reply) => {
    const { id, versionId } = documentVersionParamsSchema.parse(request.params);
    const body = updateDocumentVersionLabelSchema.parse(request.body);
    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });
    if (!canCreateVersions(role)) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const updated = await updateDocumentVersionLabel(
      db,
      id,
      versionId,
      body.label,
    );
    if (!updated) return reply.code(404).send({ error: "Not found" });
    const version = await getDocumentVersion(db, id, versionId);
    if (!version) return reply.code(404).send({ error: "Not found" });
    return withoutState(version);
  });

  app.post(
    "/documents/:id/versions/:versionId/restore",
    async (request, reply) => {
      const { id, versionId } = documentVersionParamsSchema.parse(request.params);
      const body = restoreDocumentVersionSchema.parse(request.body);
      const role = await getDocumentRole(db, request.user.id, id);
      if (!role) return reply.code(404).send({ error: "Not found" });
      if (!canRestoreVersions(role)) {
        return reply.code(403).send({ error: "Only the owner can restore versions" });
      }

      const [document] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.id, id))
        .limit(1);
      if (!document) return reply.code(404).send({ error: "Not found" });
      if (!(await getDocumentVersion(db, id, versionId))) {
        return reply.code(404).send({ error: "Not found" });
      }

      const previous = await getDocumentVersionByOperationId(
        db,
        id,
        body.operationId,
      );
      if (previous) {
        if (previous.restoredFromVersionId !== versionId) {
          return reply.code(409).send({
            error: "This operation ID was already used for another restore",
            code: "RESTORE_OPERATION_CONFLICT",
          });
        }
        return {
          status: "already-restored" as const,
          versionId: previous.id,
        };
      }

      try {
        const result = await requestLiveVersionRestore({
          operationId: body.operationId,
          documentId: id,
          versionId,
          actorId: request.user.id,
        });
        if (result.status === "timeout") {
          request.log.warn({ documentId: id }, "Live restore timed out");
          return reply.code(503).send({
            error: "The collaboration service is unavailable. No restore was confirmed.",
            code: "COLLABORATION_UNAVAILABLE",
          });
        }
        if (result.result.status === "failed") {
          if (result.result.reason === "not-owner") {
            return reply.code(403).send({ error: "Only the owner can restore versions" });
          }
          if (result.result.reason === "version-not-found") {
            return reply.code(404).send({ error: "Not found" });
          }
          if (result.result.reason === "document-changed") {
            return reply.code(409).send({
              error:
                "The document changed while restore was starting. Review the current document and try again.",
              code: "DOCUMENT_CHANGED",
            });
          }
          return reply.code(503).send({
            error: "The live document could not be restored",
            code: "RESTORE_FAILED",
          });
        }
        return {
          status: result.result.status,
          versionId: result.result.versionId,
        };
      } catch (error) {
        request.log.error({ err: error, documentId: id }, "Restore dispatch failed");
        return reply.code(503).send({
          error: "The collaboration service is unavailable. No restore was confirmed.",
          code: "COLLABORATION_UNAVAILABLE",
        });
      }
    },
  );
};
