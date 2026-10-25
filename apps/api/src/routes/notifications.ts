import type { ServerResponse } from "node:http";
import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, isNull, ne, schema } from "@synodos/db";
import { z } from "zod";
import { Redis } from "ioredis";
import { db } from "../db";
import { requireUser } from "../lib/require-user";
import { env } from "../env";
import { NOTIFICATION_CHANNEL } from "@synodos/shared";

const { notifications } = schema;
const notificationParamsSchema = z.object({ id: z.uuid() });
const notificationEventSchema = z.object({
  userId: z.string().min(1),
  notificationId: z.uuid(),
});

const sseClientsByUser = new Map<string, Set<ServerResponse>>();
let sharedSubscriber: Redis | null = null;

function getSharedSubscriber() {
  if (!sharedSubscriber) {
    sharedSubscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
    sharedSubscriber.on("error", (err) =>
      console.error("[redis] SSE subscriber error:", err.message),
    );
    void sharedSubscriber
      .subscribe(NOTIFICATION_CHANNEL)
      .catch((err) => console.error("[redis] SSE subscribe failed:", err));
    sharedSubscriber.on("message", (channel, raw) => {
      if (channel !== NOTIFICATION_CHANNEL) return;
      try {
        const parsed = notificationEventSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return;
        const clients = sseClientsByUser.get(parsed.data.userId);
        if (!clients) return;
        const payload = `event: notification\ndata: ${JSON.stringify({ notificationId: parsed.data.notificationId })}\n\n`;
        for (const res of clients) {
          if (!res.destroyed) res.write(payload);
        }
      } catch {
        // ignore malformed JSON
      }
    });
  }
  return sharedSubscriber;
}

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireUser);
  app.addHook("onClose", async () => {
    if (sharedSubscriber) {
      await sharedSubscriber.quit().catch(() => {});
      sharedSubscriber = null;
    }
  });

  app.get("/notifications", async (request) => {
    const rows = await db
      .select({
        id: notifications.id,
        actorId: notifications.actorId,
        documentId: notifications.documentId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, request.user.id),
          ne(notifications.type, "document_access_granted"),
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(50);

    return rows.map((row) => ({
      ...row,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  });

  app.get("/events", async (request, reply) => {
    const userId = request.user.id;
    getSharedSubscriber();
    const existingHeaders = reply.getHeaders();
    reply.hijack();
    for (const [key, value] of Object.entries(existingHeaders)) {
      if (value !== undefined) {
        reply.raw.setHeader(key, value);
      }
    }
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write(": connected\n\n");

    let userSet = sseClientsByUser.get(userId);
    if (!userSet) {
      userSet = new Set();
      sseClientsByUser.set(userId, userSet);
    }
    userSet.add(reply.raw);

    const heartbeat = setInterval(() => {
      if (!reply.raw.destroyed) reply.raw.write(": keep-alive\n\n");
    }, 25_000);

    reply.raw.on("close", () => {
      clearInterval(heartbeat);
      userSet?.delete(reply.raw);
      if (userSet?.size === 0) sseClientsByUser.delete(userId);
    });
  });

  app.patch("/notifications/:id/read", async (request, reply) => {
    const { id } = notificationParamsSchema.parse(request.params);
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, request.user.id),
          isNull(notifications.readAt),
        ),
      )
      .returning({
        id: notifications.id,
        readAt: notifications.readAt,
      });

    if (updated) {
      return {
        id: updated.id,
        readAt: updated.readAt?.toISOString() ?? null,
      };
    }

    const [existing] = await db
      .select({
        id: notifications.id,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, request.user.id),
        ),
      )
      .limit(1);

    if (!existing) {
      return reply.code(404).send({
        error: "Notification not found",
        code: "NOTIFICATION_NOT_FOUND",
      });
    }

    return {
      id: existing.id,
      readAt: existing.readAt?.toISOString() ?? null,
    };
  });
};
