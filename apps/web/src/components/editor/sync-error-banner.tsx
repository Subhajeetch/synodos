import { Link } from "react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** `reason` is the message thrown by the collab server, or a token-fetch failure. */
export function SyncErrorBanner({ reason }: { reason: string }) {
  const lostAccess = reason === "Forbidden";

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
          {lostAccess
            ? "It was deleted or your access was removed. Your local copy has been cleared."
            : "We couldn't verify your session. Your edits are kept on this device and will sync once you're signed in again."}
        </p>
      </div>
      {lostAccess ? (
        <Button size="sm" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" nativeButton={false} render={<Link to="/dashboard/overview" />}>
          Back to dashboard
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button size="sm" variant="default" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" nativeButton={false} render={<Link to="/login" />}>
            Sign in
          </Button>
        </div>
      )}
    </div>
  );
}