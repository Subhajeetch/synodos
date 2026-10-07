import { Link, useLocation } from "react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** `reason` is the message thrown by the collab server, or a token-fetch failure. */
export function SyncErrorBanner({
  reason,
  retrying,
  localCopyAvailable,
  onRetry,
}: {
  reason: string;
  retrying: boolean;
  localCopyAvailable: boolean;
  onRetry: () => void;
}) {
  const location = useLocation();
  const lostAccess = reason === "Forbidden";
  const needsSignIn = reason === "Unauthorized";
  const localCopyMessage = localCopyAvailable
    ? "Your local browser copy is available."
    : "A local copy has not been confirmed yet; copy any important unsynced text before leaving.";
  const description = lostAccess
    ? "It was deleted or your access was removed. Your local copy has been cleared."
    : needsSignIn
      ? `Your session could not be verified by the collaboration server. ${localCopyMessage} Sign in again or retry the connection.`
      : `The collaboration server could not be reached. ${localCopyMessage} Retry the connection to sync it.`;

  return (
    <div
      role="alert"
      className="flex shrink-0 flex-wrap items-center gap-4 border-b border-destructive/20 bg-destructive/5 px-6 py-3 text-sm shadow-sm"
    >
      <AlertCircle className="size-5 text-destructive/80" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-destructive/90">
          {lostAccess ? "You no longer have access to this document" : "Live sync is paused"}
        </p>
        <p className="text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
      {lostAccess ? (
        <Button size="sm" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" nativeButton={false} render={<Link to="/dashboard/overview" />}>
          Back to dashboard
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/20 text-destructive hover:bg-destructive/10"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying && <Loader2 className="mr-2 size-4 animate-spin" />}
            {retrying ? "Reconnecting…" : "Retry sync"}
          </Button>
          <Button
            size="sm"
            variant="default"
            nativeButton={false}
            render={
              <Link
                to="/login?reauth=1"
                state={{ from: `${location.pathname}${location.search}` }}
              />
            }
          >
            Sign in again
          </Button>
        </div>
      )}
    </div>
  );
}