import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export type NotificationSummary = {
  id: string;
  actorId: string | null;
  documentId: string | null;
  type:
    | "document_invitation_received"
    | "document_invitation_revoked"
    | "document_deleted"
    | "document_invitation_accepted"
    | "document_join_request_received"
    | "document_join_request_approved"
    | "document_join_request_rejected"
    | "document_member_added"
    | "document_member_removed"
    | "document_role_changed";
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export function canOpenNotificationDocument(type: NotificationSummary["type"]) {
  return [
    "document_invitation_received",
    "document_invitation_accepted",
    "document_join_request_received",
    "document_join_request_approved",
    "document_member_added",
    "document_role_changed",
  ].includes(type);
}

export const notificationKey = ["notifications", "list"] as const;

export function useNotifications() {
  return useQuery({
    queryKey: notificationKey,
    queryFn: () => api<NotificationSummary[]>("/api/notifications"),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api<{ id: string; readAt: string | null }>(
        `/api/notifications/${id}/read`,
        { method: "PATCH" },
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationSummary[]>(
        notificationKey,
        (notifications) =>
          notifications?.map((notification) =>
            notification.id === updated.id
              ? { ...notification, readAt: updated.readAt }
              : notification,
          ),
      );
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the notification.",
      ),
  });
}
