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

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireUser);

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
    const subscriber = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
    });
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      subscriber.removeAllListeners("message");
      void subscriber.quit().catch((error: unknown) => {
        request.log.warn({ err: error }, "Could not close notification stream");
      });
    };
    const heartbeat = setInterval(() => {
      if (!reply.raw.destroyed) reply.raw.write(": keep-alive\n\n");
    }, 25_000);

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write(": connected\n\n");
    reply.raw.on("close", close);

    subscriber.on("error", (error) => {
      request.log.error({ err: error }, "Notification stream Redis error");
    });
    subscriber.on("message", (channel, raw) => {
      if (channel !== NOTIFICATION_CHANNEL || reply.raw.destroyed) return;
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        request.log.warn("Ignoring malformed notification stream event");
        return;
      }
      const parsed = notificationEventSchema.safeParse(value);
      if (!parsed.success || parsed.data.userId !== userId) return;
      reply.raw.write(
        `event: notification\ndata: ${JSON.stringify({ notificationId: parsed.data.notificationId })}\n\n`,
      );
    });

    try {
      await subscriber.subscribe(NOTIFICATION_CHANNEL);
    } catch (error) {
      request.log.error({ err: error }, "Could not subscribe notification stream");
      close();
      reply.raw.end();
    }
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
