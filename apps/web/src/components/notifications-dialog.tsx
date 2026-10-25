import { useEffect } from "react";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { timeAgo } from "@/lib/time";
import {
  canOpenNotificationDocument,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { documentKeys } from "@/hooks/use-documents";

export function NotificationsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  const { refetch } = notifications;
  const markRead = useMarkNotificationRead();
  const unreadCount =
    notifications.data?.filter((notification) => !notification.readAt).length ??
    0;

  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  function openNotification(
    id: string,
    documentId: string | null,
    type: Parameters<typeof canOpenNotificationDocument>[0],
  ) {
    markRead.mutate(id);
    onOpenChange(false);
    if (documentId && canOpenNotificationDocument(type)) {
      queryClient.removeQueries({
        queryKey: documentKeys.detail(documentId),
        exact: true,
      });
      queryClient.removeQueries({
        queryKey: documentKeys.access(documentId),
        exact: true,
      });
      navigate(`/docs/${documentId}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(80vh,680px)] max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bell className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg">Notifications</DialogTitle>
              <DialogDescription className="mt-1">
                Updates about your documents and collaborators.
              </DialogDescription>
            </div>
            {unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {unreadCount} unread
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[min(65vh,560px)] overflow-y-auto">
          {notifications.isFetching && (
            <div
              className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="size-5 animate-spin text-primary" />
              Loading your notifications…
            </div>
          )}

          {!notifications.isFetching && notifications.isError && (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="font-medium">Couldn’t load notifications</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {notifications.error instanceof Error
                  ? notifications.error.message
                  : "Something went wrong. Please try again."}
              </p>
              <Button
                variant="outline"
                onClick={() => void notifications.refetch()}
              >
                Try again
              </Button>
            </div>
          )}

          {!notifications.isFetching &&
            !notifications.isError &&
            notifications.data?.length === 0 && (
              <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Check className="size-5" />
                </span>
                <p className="font-medium">You’re all caught up</p>
                <p className="text-sm text-muted-foreground">
                  New document and collaboration updates will appear here.
                </p>
              </div>
            )}

          {!notifications.isFetching &&
            !notifications.isError &&
            notifications.data &&
            notifications.data.length > 0 && (
              <ul className="divide-y divide-border/50">
                {notifications.data.map((notification) => (
                  <li
                    key={notification.id}
                    className={`flex items-start gap-2 px-4 py-3 transition-colors sm:px-6 ${
                      notification.readAt ? "" : "bg-primary/[0.035]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openNotification(
                          notification.id,
                          notification.documentId,
                          notification.type,
                        )
                      }
                      className="flex min-w-0 flex-1 gap-3 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          notification.readAt ? "bg-transparent" : "bg-primary"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium leading-5 text-foreground">
                            {notification.title}
                          </span>
                          <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </span>
                        <span className="block text-sm leading-5 text-muted-foreground">
                          {notification.message}
                        </span>
                      </span>
                    </button>
                    {!notification.readAt && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary"
                        aria-label={`Mark "${notification.title}" as read`}
                        title="Mark as read"
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate(notification.id)}
                      >
                        <CheckCheck className="size-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
