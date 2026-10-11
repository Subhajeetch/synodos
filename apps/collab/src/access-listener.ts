import { Redis } from "ioredis";
import type { Hocuspocus } from "@hocuspocus/server";
import {
  ACCESS_CHANNEL,
  NOTIFICATION_CHANNEL,
  USER_EVENTS_ROOM_PREFIX,
  accessChangedEventSchema,
  canEdit,
  notificationPublishedEventSchema,
} from "@synodos/shared";

const RESET_CONNECTION = { code: 4205, reason: "Reset Connection" };

export function listenForAccessChanges(
  hocuspocus: Hocuspocus,
  redisUrl: string,
) {
  const sub = new Redis(redisUrl);
  sub.on("error", (err) =>
    console.error("[redis] subscriber error:", err.message),
  );
  sub
    .subscribe(ACCESS_CHANNEL, NOTIFICATION_CHANNEL)
    .catch((err) => console.error("[redis] subscribe failed:", err));

  sub.on("message", (channel, raw) => {
    if (channel === NOTIFICATION_CHANNEL) {
      const event = notificationPublishedEventSchema.safeParse(safeJson(raw));
      if (!event.success) {
        console.warn("[notifications] ignoring malformed event");
        return;
      }
      hocuspocus.documents
        .get(`${USER_EVENTS_ROOM_PREFIX}${event.data.userId}`)
        ?.broadcastStateless(
          JSON.stringify({
            type: "notification-created",
            notificationId: event.data.notificationId,
          }),
        );
      return;
    }
    if (channel !== ACCESS_CHANNEL) return;

    const parsed = accessChangedEventSchema.safeParse(safeJson(raw));
    if (!parsed.success) {
      console.warn("[access] ignoring malformed event");
      return;
    }
    const { documentId, userId, reason, role } = parsed.data;

    // Document deletion is an access change for every connected member.
    if (userId === null) {
      hocuspocus.documents
        .get(documentId)
        ?.broadcastStateless(
          JSON.stringify({ type: "document-deleted", documentId }),
        );
      hocuspocus.closeConnections(documentId);
      return;
    }

    const doc = hocuspocus.documents.get(documentId);
    if (!doc) return; // nobody on this instance has it open

    if (reason === "member-removed") {
      doc.broadcastStateless(
        JSON.stringify({ type: "member-removed", userId }),
      );
    }

    for (const connection of [...doc.connections.keys()]) {
      if (connection.context?.userId !== userId) continue;

      if (reason === "role-changed" && role) {
        connection.readOnly = !canEdit(role);
        if (connection.context && typeof connection.context === "object") {
          connection.context.role = role;
        }
        connection.sendStateless(
          JSON.stringify({ type: "member-role-changed", userId, role }),
        );
        continue;
      }

      connection.close(RESET_CONNECTION);
    }
  });

  return () => sub.quit();
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
