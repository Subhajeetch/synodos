import { useState } from "react";
import {
  AlertCircle,
  Clock,
  Loader2,
  PencilLine,
  Plus,
  RotateCw,
} from "lucide-react";
import type { DocumentRole, DocumentVersionSummary } from "@synodos/shared";
import { canCreateVersions } from "@synodos/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useCreateDocumentVersion,
  useDocumentVersions,
  useRenameDocumentVersion,
} from "@/hooks/use-document-versions";
import { timeAgo } from "@/lib/time";
import { toast } from "sonner";

type Props = {
  documentId: string;
  role: DocumentRole;
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
};

type LabelTarget = { id: string; label: string } | null;

function versionKindLabel(kind: DocumentVersionSummary["kind"]) {
  return kind === "pre_restore" ? "Before restore" : kind.replace("_", " ");
}

function groupVersionsByDay(versions: DocumentVersionSummary[]) {
  const groups = new Map<string, DocumentVersionSummary[]>();
  for (const version of versions) {
    const day = new Date(version.createdAt).toDateString();
    groups.set(day, [...(groups.get(day) ?? []), version]);
  }
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  return [...groups.entries()].map(([day, items]) => ({
    day,
    label:
      day === today
        ? "Today"
        : day === yesterday
          ? "Yesterday"
          : new Date(day).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
    items,
  }));
}

export function VersionHistoryPanel({
  documentId,
  role,
  selectedVersionId,
  onSelectVersion,
}: Props) {
  const history = useDocumentVersions(documentId);
  const create = useCreateDocumentVersion(documentId);
  const rename = useRenameDocumentVersion(documentId);
  const [labelTarget, setLabelTarget] = useState<LabelTarget>(null);
  const [label, setLabel] = useState("");
  const canCreate = canCreateVersions(role);
  const versions = history.data?.pages.flatMap((page) => page.items) ?? [];
  const groupedVersions = groupVersionsByDay(versions);
  const total = history.data?.pages[0]?.total ?? 0;
  const busy = create.isPending || rename.isPending;

  function openNewCheckpoint() {
    setLabelTarget({ id: "", label: "" });
    setLabel("");
  }

  function openRename(version: DocumentVersionSummary) {
    setLabelTarget({ id: version.id, label: version.label ?? "" });
    setLabel(version.label ?? "");
  }

  function saveLabel() {
    const normalized = label.trim();
    if (!normalized) return;
    if (labelTarget?.id) {
      rename.mutate(
        { versionId: labelTarget.id, label: normalized },
        {
          onSuccess: () => {
            toast.success("Version name updated");
            setLabelTarget(null);
          },
          onError: (error) =>
            toast.error(error instanceof Error ? error.message : "Rename failed"),
        },
      );
      return;
    }
    create.mutate(normalized, {
      onSuccess: (version) => {
        toast.success("Named checkpoint created");
        setLabelTarget(null);
        onSelectVersion(version.id);
      },
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Checkpoint failed"),
    });
  }

  return (
    <section
      aria-labelledby="version-history-heading"
      className="space-y-3 rounded-xl border border-border/50 bg-card/60 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          id="version-history-heading"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <Clock size={15} aria-hidden="true" />
          Version history
          {total > 0 && <span className="normal-case">({total})</span>}
        </h3>
        {canCreate && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={openNewCheckpoint}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Name this version
          </Button>
        )}
      </div>

      {history.isPending ? (
        <div className="space-y-2" role="status" aria-label="Loading versions">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-lg bg-muted/60 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : history.isError && versions.length === 0 ? (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs"
        >
          <p className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            Version history couldn’t be loaded.
          </p>
          <p className="text-muted-foreground">
            {history.error instanceof Error
              ? history.error.message
              : "Please try again."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void history.refetch()}
          >
            <RotateCw className="size-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : versions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
          No saved versions yet. Automatic snapshots appear as your team edits.
        </p>
      ) : (
        <>
          {history.isError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs"
            >
              <span>Refresh failed; showing the last loaded history.</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void history.refetch()}
              >
                Retry
              </Button>
            </div>
          )}
          <div className="space-y-3" aria-label="Document versions">
            {groupedVersions.map((group) => (
              <section key={group.day} className="space-y-1.5">
                <h4 className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h4>
                <ol className="space-y-2">
                  {group.items.map((version) => {
              const authorName = version.author.name || "Synodos system";
              const selected = version.id === selectedVersionId;
              return (
                <li
                  key={version.id}
                  className={`flex items-start gap-2 rounded-lg border p-2 transition-colors motion-reduce:transition-none ${
                    selected
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 bg-background/70 hover:bg-muted/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectVersion(version.id)}
                    aria-pressed={selected}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Avatar className="mt-0.5 size-7 shrink-0">
                      {version.author.image && (
                        <AvatarImage
                          src={version.author.image}
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <AvatarFallback className="text-[10px]">
                        {authorName.trim().charAt(0).toUpperCase() || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium">
                          {version.label ?? authorName}
                        </span>
                        <Badge
                          variant="secondary"
                          className="shrink-0 px-1.5 py-0 text-[9px] capitalize"
                        >
                          {versionKindLabel(version.kind)}
                        </Badge>
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {version.label
                          ? `${authorName} · ${version.contributorCount} contributor${version.contributorCount === 1 ? "" : "s"}`
                          : `${authorName} · ${versionKindLabel(version.kind)} · ${version.contributorCount} contributor${version.contributorCount === 1 ? "" : "s"}`}
                      </span>
                      <time
                        className="block text-[10px] text-muted-foreground"
                        dateTime={version.createdAt}
                        title={new Date(version.createdAt).toLocaleString()}
                      >
                        {timeAgo(version.createdAt)}
                      </time>
                    </span>
                  </button>
                  {canCreate && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground"
                      aria-label={`Rename version from ${new Date(version.createdAt).toLocaleString()}`}
                      title="Rename version"
                      onClick={() => openRename(version)}
                    >
                      <PencilLine className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </li>
              );
                  })}
                </ol>
              </section>
            ))}
          </div>
          {history.hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              {history.isFetchingNextPage && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              Load more versions
            </Button>
          )}
          {history.isFetchNextPageError && (
            <div className="flex items-center justify-between gap-2 text-xs text-destructive" role="alert">
              <span>More versions could not be loaded.</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void history.fetchNextPage()}
              >
                Retry
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog
        open={labelTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setLabelTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {labelTarget?.id ? "Rename version" : "Name this version"}
            </DialogTitle>
            <DialogDescription>
              {labelTarget?.id
                ? "Give this saved version a label your team can recognize."
                : "Save a named checkpoint of the document so your team can find it later."}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={label}
            maxLength={120}
            placeholder="For example, Final review"
            aria-label="Version name"
            onChange={(event) => setLabel(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveLabel();
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLabelTarget(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onClick={saveLabel}
              disabled={!label.trim() || busy}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {labelTarget?.id ? "Save name" : "Create checkpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
