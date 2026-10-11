import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  HocuspocusProviderWebsocket,
  WebSocketStatus,
} from "@hocuspocus/provider";
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusEvent,
} from "@hocuspocus/provider-react";
import {
  USER_EVENTS_ROOM_PREFIX,
  notificationCreatedMessageSchema,
} from "@synodos/shared";
import { documentKeys } from "@/hooks/use-documents";
import { notificationKey } from "@/hooks/use-notifications";
import { authClient } from "@/lib/auth-client";
import { COLLAB_URL } from "@/lib/collab";
import { getCollabToken } from "@/lib/collab";

export function DashboardCollaboration({
  children,
}: {
  children: ReactNode;
}) {
  const [websocket] = useState(
    () =>
      new HocuspocusProviderWebsocket({
        url: COLLAB_URL,
        messageReconnectTimeout: 150_000,
        maxAttempts: 0,
      }),
  );
  const destroyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (destroyTimeoutRef.current) {
      clearTimeout(destroyTimeoutRef.current);
      destroyTimeoutRef.current = null;
    }

    function reconnectIfNeeded() {
      if (
        document.visibilityState === "visible" &&
        websocket.shouldConnect &&
        websocket.status === WebSocketStatus.Disconnected
      ) {
        void websocket.connect();
      }
    }

    document.addEventListener("visibilitychange", reconnectIfNeeded);
    window.addEventListener("focus", reconnectIfNeeded);
    window.addEventListener("online", reconnectIfNeeded);

    return () => {
      document.removeEventListener("visibilitychange", reconnectIfNeeded);
      window.removeEventListener("focus", reconnectIfNeeded);
      window.removeEventListener("online", reconnectIfNeeded);
      destroyTimeoutRef.current = setTimeout(() => {
        websocket.destroy();
      }, 0);
    };
  }, [websocket]);

  return (
    <HocuspocusProviderWebsocketComponent websocketProvider={websocket}>
      {session?.user.id && (
        <HocuspocusRoom
          name={`${USER_EVENTS_ROOM_PREFIX}${session.user.id}`}
          token={getCollabToken}
        >
          <DashboardNotificationEvents />
        </HocuspocusRoom>
      )}
      {children}
    </HocuspocusProviderWebsocketComponent>
  );
}

function DashboardNotificationEvents() {
  const queryClient = useQueryClient();

  useHocuspocusEvent("stateless", ({ payload }) => {
    let message: unknown;
    try {
      message = JSON.parse(payload);
    } catch {
      return;
    }
    if (!notificationCreatedMessageSchema.safeParse(message).success) return;

    void queryClient.invalidateQueries({ queryKey: notificationKey });
    void queryClient.invalidateQueries({ queryKey: documentKeys.list() });
  });

  return null;
}
