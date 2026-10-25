import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  HocuspocusProviderWebsocket,
  WebSocketStatus,
} from "@hocuspocus/provider";
import { HocuspocusProviderWebsocketComponent } from "@hocuspocus/provider-react";
import { COLLAB_URL } from "@/lib/collab";

export function DashboardCollaboration({ children }: { children: ReactNode }) {
  const [websocket] = useState(
    () =>
      new HocuspocusProviderWebsocket({
        url: COLLAB_URL,
        messageReconnectTimeout: 150_000,
        maxAttempts: 0,
      }),
  );
  const destroyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      {children}
    </HocuspocusProviderWebsocketComponent>
  );
}
