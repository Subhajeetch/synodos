import { Redis } from "ioredis";
import type { Hocuspocus } from "@hocuspocus/server";
import { ACCESS_CHANNEL, accessChangedSchema } from "@synodos/shared";

const RESET_CONNECTION = { code: 4205, reason: "Reset Connection" };

export function listenForAccessChanges(hocuspocus: Hocuspocus, redisUrl: string) {
  const sub = new Redis(redisUrl);
  sub.on("error", (err) => console.error("[redis] subscriber error:", err.message));
  sub.subscribe(ACCESS_CHANNEL).catch((err) => console.error("[redis] subscribe failed:", err));

  sub.on("message", (_channel, raw) => {
    const parsed = accessChangedSchema.safeParse(safeJson(raw));
    if (!parsed.success) {
      console.warn("[access] ignoring malformed event");
      return;
    }
    const { documentId, userId } = parsed.data;

    // document deleted: close everyone on it.
    if (userId === null) {
      hocuspocus.closeConnections(documentId);
      return;
    }

    const doc = hocuspocus.documents.get(documentId);
    if (!doc) return; // nobody on this instance has it open

    for (const connection of [...doc.connections.keys()]) {
      if (connection.context?.userId === userId) connection.close(RESET_CONNECTION);
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