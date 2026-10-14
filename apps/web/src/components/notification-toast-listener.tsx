import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { documentKeys } from "@/hooks/use-documents";
import {
  canOpenNotificationDocument,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "react-router";
import { notificationKey } from "@/hooks/use-notifications";

const API_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL ?? "http://localhost:4000")
  : "";

export function NotificationToastListener() {
  const { data: notifications } = useNotifications();
  const markNotificationRead = useMarkNotificationRead();
  const { data: session } = authClient.useSession();
  const fallbackSeenIds = useRef(new Set<string>());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session?.user.id) return;
    const events = new EventSource(`${API_URL}/api/events`, {
      withCredentials: true,
    });
    const onNotification = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKey });
      void queryClient.invalidateQueries({ queryKey: documentKeys.list() });
    };
    events.addEventListener("notification", onNotification);
    return () => {
      events.removeEventListener("notification", onNotification);
      events.close();
    };
  }, [queryClient, session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!notifications || !userId) return;
    const storageKey = `synodos:seen-notifications:${userId}`;
    let seenIds: string[];
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === null) {
        notifications.forEach(({ id }) => fallbackSeenIds.current.add(id));
        window.localStorage.setItem(
          storageKey,
          JSON.stringify(notifications.map(({ id }) => id)),
        );
        return;
      }
      const parsed: unknown = JSON.parse(stored);
      seenIds = Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];
    } catch (error) {
      console.warn("Could not read notification history:", error);
      seenIds = [...fallbackSeenIds.current];
    }
    seenIds.forEach((id) => fallbackSeenIds.current.add(id));
    const seen = new Set(seenIds);
    const newNotifications = notifications.filter(
      (notification) => !seen.has(notification.id),
    );

    for (const notification of newNotifications) {
      seen.add(notification.id);
      fallbackSeenIds.current.add(notification.id);
      if (notification.documentId) {
        void queryClient.invalidateQueries({
          queryKey: documentKeys.list(),
        });
      }
      toast.info(notification.title, {
        id: notification.id,
        description: notification.message,
        action:
          notification.documentId &&
          canOpenNotificationDocument(notification.type)
          ? {
              label: "Open",
              onClick: () => {
                markNotificationRead.mutate(notification.id);
                queryClient.removeQueries({
                  queryKey: documentKeys.detail(notification.documentId!),
                  exact: true,
                });
                queryClient.removeQueries({
                  queryKey: documentKeys.access(notification.documentId!),
                  exact: true,
                });
                navigate(`/docs/${notification.documentId}`);
              },
            }
          : undefined,
      });
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify([...seen].slice(-100)),
      );
    } catch (error) {
      console.warn("Could not save notification history:", error);
    }
  }, [
    markNotificationRead,
    navigate,
    notifications,
    queryClient,
    session?.user.id,
  ]);

  return null;
}
