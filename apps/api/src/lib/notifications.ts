import { desc, eq, inArray, schema } from "@synodos/db";
import { NOTIFICATION_CHANNEL } from "@synodos/shared";
import { z } from "zod";
import { Redis } from "ioredis";
import { db } from "../db";
import { env } from "../env";

const { notifications, notificationType, user } = schema;

const notificationInputSchema = z.object({
  userId: z.string().min(1),
  actorId: z.string().min(1).nullable().optional(),
  documentId: z.uuid().nullable().optional(),
  type: z.enum(notificationType.enumValues),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
});

const MAX_NOTIFICATIONS_PER_USER = 50;
const publisher = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
publisher.on("error", (error) =>
  console.error("[redis] notification publisher error:", error.message),
);

async function persistNotification(
  input: z.input<typeof notificationInputSchema>,
) {
  const notification = notificationInputSchema.parse(input);

  const created = await db.transaction(async (tx) => {
    const [recipient] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, notification.userId))
      .for("update")
      .limit(1);

    if (!recipient) {
      throw new Error("Notification recipient does not exist");
    }

    const [inserted] = await tx
      .insert(notifications)
      .values({
        ...notification,
        actorId: notification.actorId ?? null,
        documentId: notification.documentId ?? null,
      })
      .returning({ id: notifications.id });
    if (!inserted) throw new Error("Failed to create notification");

    const oldest = await tx
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.userId, notification.userId))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .offset(MAX_NOTIFICATIONS_PER_USER);

    if (oldest.length > 0) {
      await tx.delete(notifications).where(
        inArray(
          notifications.id,
          oldest.map(({ id }) => id),
        ),
      );
    }
    return inserted;
  });

  try {
    await publisher.publish(
      NOTIFICATION_CHANNEL,
      JSON.stringify({
        userId: notification.userId,
        notificationId: created.id,
      }),
    );
  } catch (error) {
    console.error("[redis] failed to publish notification event:", error);
  }
}

export async function createNotification(
  input: z.input<typeof notificationInputSchema>,
) {
  try {
    await persistNotification(input);
  } catch (error) {
    console.error("[notifications] failed to persist notification:", {
      type: input.type,
      userId: input.userId,
      error,
    });
  }
}
