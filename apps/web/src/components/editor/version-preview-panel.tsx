import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import type { DocumentRole, DocumentVersionSummary } from "@synodos/shared";
import { canRestoreVersions } from "@synodos/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/time";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  version: DocumentVersionSummary;
  role: DocumentRole;
  position: number;
  total: number;
  canOlder: boolean;
  canNewer: boolean;
  loadingDirection: "older" | "newer" | null;
  activeCollaborators: number;
  onPrevious: () => void;
  onNext: () => void;
  onBack: () => void;
  onRestore: () => void;
  restoring: boolean;
};

export function VersionPreviewPanel({
  version,
  role,
  position,
  total,
  canOlder,
  canNewer,
  loadingDirection,
  activeCollaborators,
  onPrevious,
  onNext,
  onBack,
  onRestore,
  restoring,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canRestore = canRestoreVersions(role);
  const author = version.author.name || "Synodos system";
  const timestamp = new Date(version.createdAt).toLocaleString();
  const kind = version.kind === "pre_restore"
    ? "Before restore"
    : version.kind.replace("_", " ");

  return (
    <>
      <section
        aria-label="Historical version preview"
        aria-live="polite"
        className="fixed inset-x-3 bottom-20 z-40 w-auto rounded-xl border border-primary/30 bg-background/95 p-4 text-foreground shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-16 sm:w-[min(24rem,calc(100%-2rem))]"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {version.label ?? `${kind} version`}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="capitalize">
                {kind}
              </Badge>
              <span className="truncate">{author}</span>
            </div>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Return to current document"
            title="Return to current document"
            onClick={onBack}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          <time dateTime={version.createdAt} title={timestamp}>
            {timestamp} · {timeAgo(version.createdAt)}
          </time>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Version {position} of {total}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!canOlder || loadingDirection !== null}
            aria-label={loadingDirection === "older" ? "Loading older version" : "View older version"}
            aria-busy={loadingDirection === "older"}
          >
            {loadingDirection === "older" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowLeft className="size-3.5" aria-hidden="true" />
            )}
            Older
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!canNewer || loadingDirection !== null}
            aria-label={loadingDirection === "newer" ? "Loading newer version" : "View newer version"}
            aria-busy={loadingDirection === "newer"}
          >
            {loadingDirection === "newer" && (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            )}
            Newer
            {loadingDirection !== "newer" && (
              <ArrowRight className="size-3.5" aria-hidden="true" />
            )}
          </Button>
          <Button
            className="col-span-2"
            variant={canRestore ? "default" : "outline"}
            size="sm"
            disabled={!canRestore || restoring}
            onClick={() => setConfirmOpen(true)}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Restore this version
          </Button>
        </div>
        {!canRestore && (
          <p className="mt-2 text-xs text-muted-foreground">
            Only the document owner can restore an earlier version.
          </p>
        )}
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this version?</DialogTitle>
            <DialogDescription>
              This replaces the current content for everyone with the version
              from {timestamp} by {author}. Your current version will be saved
              first so you can undo this.
              {activeCollaborators > 0 &&
                ` ${activeCollaborators} collaborator${activeCollaborators === 1 ? " is" : "s are"} currently active.`}
              {" "}People with offline edits may merge those edits when they reconnect.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            Connected collaborators will see the restored document. Offline
            copies still follow Yjs merge behavior when they reconnect and can
            reintroduce their pending edits.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button
              onClick={onRestore}
              disabled={restoring}
            >
              {restoring ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="size-4" aria-hidden="true" />
              )}
              {restoring ? "Restoring…" : "Restore for everyone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
