import { Redis } from "ioredis";
import type { Hocuspocus } from "@hocuspocus/server";
import {
  ACCESS_CHANNEL,
  accessChangedEventSchema,
  canEdit,
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
    .subscribe(ACCESS_CHANNEL)
    .catch((err) => console.error("[redis] subscribe failed:", err));

  sub.on("message", (_channel, raw) => {
    const parsed = accessChangedEventSchema.safeParse(safeJson(raw));
    if (!parsed.success) {
      console.warn("[access] ignoring malformed event");
      return;
    }
    const { documentId, userId, reason, role } = parsed.data;

    // document deleted: close everyone on it.
    if (userId === null) {
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
