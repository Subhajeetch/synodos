import { useState } from "react";
import { Link } from "react-router";
import { CalendarClock, Ellipsis, FileText, Pencil, Trash2 } from "lucide-react";
import {
  canEdit,
  canManageMembers,
  type DocumentSummary,
} from "@synodos/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DeleteDocumentDialog } from "./delete-document-dialog";
import { RenameDocumentDialog } from "./rename-document-dialog";
import { RoleBadge } from "./role-badge";

export function DocumentCard({ doc }: { doc: DocumentSummary }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editable = canEdit(doc.role);
  const deletable = canManageMembers(doc.role); // owner only
  const isOwner = doc.role === "owner";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-card/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-border/80 hover:bg-card hover:shadow-md">
      {/* Top accent line */}
      <div className={cn("absolute inset-x-0 top-0 h-1 w-full", isOwner ? "bg-primary" : "bg-secondary")} />
      
      <div className="mb-5 flex items-start justify-between gap-4 mt-1">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
          <FileText className="size-5" />
        </span>
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
                <DropdownMenuItem onClick={() => setRenameOpen(true)} className="cursor-pointer">
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
        <h2 className="line-clamp-2 pr-2 text-lg font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
          <Link
            to={`/docs/${doc.id}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {doc.title}
          </Link>
        </h2>
        
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-2">
          <RoleBadge role={doc.role} />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5 opacity-70" />
            {timeAgo(doc.updatedAt)}
          </span>
        </div>
      </div>

      {/* Siblings of the menu, so they survive the menu closing. */}
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
