import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  useHocuspocusProvider,
  HocuspocusRoom,
} from "@hocuspocus/provider-react";
import * as Y from "yjs";
import { CalendarClock, Ellipsis, FileText, Pencil, Trash2 } from "lucide-react";
import {
  canEdit,
  canManageMembers,
  type DocumentSummary,
} from "@synodos/shared";
import { usePresence } from "@/hooks/use-presence";
import { authClient } from "@/lib/auth-client";
import { getCollabToken } from "@/lib/collab";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PresenceAvatars } from "@/components/editor/presence";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDocumentDialog } from "./delete-document-dialog";
import { RenameDocumentDialog } from "./rename-document-dialog";
import { RoleBadge } from "./role-badge";

export function DocumentCard({ doc }: { doc: DocumentSummary }) {
  return <DocumentCardContent doc={doc} />;
}

function nodeText(node: Y.XmlElement | Y.XmlText): string {
  if (node instanceof Y.XmlText) return node.toString();
  return node
    .toArray()
    .map((child) =>
      child instanceof Y.XmlElement || child instanceof Y.XmlText
        ? nodeText(child)
        : "",
    )
    .join("");
}

function getFirstPageText(document: Y.Doc): string[] {
  const blocks = document.getXmlFragment("default").toArray();
  const page = blocks.find(
    (node): node is Y.XmlElement =>
      node instanceof Y.XmlElement && node.nodeName === "page",
  );
  const content = page?.toArray() ?? blocks;

  return content
    .map((node) =>
      node instanceof Y.XmlElement || node instanceof Y.XmlText
        ? nodeText(node).trim()
        : "",
    )
    .filter(Boolean)
    .slice(0, 6);
}

function DocumentPreview({ documentId }: { documentId: string }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return (
    <div
      ref={setElement}
      className="relative flex h-36 items-start justify-center overflow-hidden bg-muted/40 px-4 pt-4"
    >
      {inView ? (
        <HocuspocusRoom name={documentId} token={getCollabToken}>
          <LiveDocumentPreview />
        </HocuspocusRoom>
      ) : (
        <PagePreview lines={[]} />
      )}
    </div>
  );
}

function PagePreview({
  lines,
  presence = [],
}: {
  lines: string[];
  presence?: ReturnType<typeof usePresence>;
}) {
  return (
    <>
      <div className="relative min-h-48 w-[65%] rounded-t-md border border-border/50 bg-background px-5 py-4 shadow-sm">
        {lines.length > 0 ? (
          <div className="space-y-2.5">
            {lines.map((line, index) => (
              <p
                key={`${index}-${line}`}
                className={cn(
                  "line-clamp-2 text-[7px] leading-[1.55] text-foreground/75",
                  index === 0 && "text-[9px] font-semibold text-foreground",
                )}
              >
                {line}
              </p>
            ))}
          </div>
        ) : (
          <div className="grid h-20 place-items-center text-muted-foreground/60">
            <FileText className="size-6" />
          </div>
        )}
      </div>
      {presence.length > 0 && (
        <div
          className="absolute right-3 top-3 rounded-full border border-border/60 bg-background/90 p-1 shadow-sm"
          title={`${presence.length} collaborator${presence.length === 1 ? "" : "s"} online`}
        >
          <PresenceAvatars users={presence} />
        </div>
      )}
    </>
  );
}

function DocumentCardContent({ doc }: { doc: DocumentSummary }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editable = canEdit(doc.role);
  const deletable = canManageMembers(doc.role);
  const isOwner = doc.role === "owner";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-card/50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-border/80 hover:bg-card hover:shadow-md">
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-10 h-1 w-full",
          isOwner ? "bg-primary" : "bg-secondary",
        )}
      />

      <DocumentPreview documentId={doc.id} />

      <div className="flex flex-1 flex-col p-5 pt-4">
        <div className="mb-4 flex items-start justify-between gap-4">

          <h2 className="line-clamp-2 pr-2 text-lg font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary flex gap-3 items-center">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
                <FileText className="size-4" />
              </span>
            <Link
              to={`/docs/${doc.id}`}
              className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 truncate"
            >
              {doc.title}
            </Link>
          </h2>

          {(editable || deletable) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative z-10 size-8 text-muted-foreground opacity-60 hover:bg-muted hover:text-foreground hover:opacity-100 data-[state=open]:opacity-100"
                    aria-label="Document actions"
                  />
                }
              >
                <Ellipsis className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-lg">
                {editable && (
                  <DropdownMenuItem
                    onClick={() => setRenameOpen(true)}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 size-4" /> Rename
                  </DropdownMenuItem>
                )}
                {deletable && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                    className="cursor-pointer focus:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 size-4" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-1 flex-col space-y-3">

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-2">
            <RoleBadge role={doc.role} />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5 opacity-70" />
              {timeAgo(doc.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {editable && (
        <RenameDocumentDialog
          doc={doc}
          open={renameOpen}
          onOpenChange={setRenameOpen}
        />
      )}
      {deletable && (
        <DeleteDocumentDialog
          doc={doc}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </article>
  );
}

function LiveDocumentPreview() {
  const [pageLines, setPageLines] = useState<string[]>([]);
  const provider = useHocuspocusProvider();
  const { data: session } = authClient.useSession();
  const presence = usePresence(session?.user.id);

  useEffect(() => {
    const refreshPreview = () => {
      setPageLines(getFirstPageText(provider.document));
    };
    refreshPreview();
    provider.document.on("update", refreshPreview);
    return () => provider.document.off("update", refreshPreview);
  }, [provider]);

  return <PagePreview lines={pageLines} presence={presence} />;
}
