import {
  ArrowDown,
  ArrowUp,
  CopyPlus,
  Plus,
  PlusSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addPageAfter,
  deletePage,
  duplicatePage,
  getPageRanges,
  movePage,
} from "./page-actions";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

export function PageControls({
  editor,
  pageIndex,
  title,
  onTitleChange,
  className,
  editable = true,
}: {
  editor: Editor;
  pageIndex: number;
  title: string;
  onTitleChange?: (title: string) => void;
  className?: string;
  editable?: boolean;
}) {
  const pageCount = getPageRanges(editor.state.doc).length;
  const pageNumber = pageIndex + 1;

  return (
    <div
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-t-xl border border-border/60 bg-muted/50 px-3 text-foreground shadow-sm",
        className,
      )}
      aria-label={`Page ${pageNumber} controls`}
    >
      {onTitleChange ? (
        <input
          aria-label={`Page ${pageNumber} title`}
          className="h-8 min-w-0 flex-1 rounded-4xl border border-transparent bg-transparent px-2 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 hover:bg-background/70 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70"
          placeholder={`Page ${pageNumber} · Add page title`}
          value={title}
          readOnly={!editable}
          disabled={!editable}
          onChange={(event) => onTitleChange(event.currentTarget.value)}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate px-2 text-sm font-medium text-foreground">
          Page {pageNumber}
          {title ? ` · ${title}` : " · Add page title"}
        </span>
      )}
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label={`Move page ${pageNumber} up`}
          title="Move page up"
          disabled={!editable || pageIndex === 0}
          onClick={() => movePage(editor, pageIndex, -1)}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label={`Move page ${pageNumber} down`}
          title="Move page down"
          disabled={!editable || pageIndex === pageCount - 1}
          onClick={() => movePage(editor, pageIndex, 1)}
        >
          <ArrowDown className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border/70" aria-hidden="true" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label={`Duplicate page ${pageNumber}`}
          title="Duplicate page"
          disabled={!editable}
          onClick={() => duplicatePage(editor, pageIndex)}
        >
          <CopyPlus className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 text-destructive hover:text-destructive"
          aria-label={`Delete page ${pageNumber}`}
          title="Delete page"
          disabled={!editable || pageCount <= 1}
          onClick={() => deletePage(editor, pageIndex)}
        >
          <Trash2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label={`Add page below page ${pageNumber}`}
          title="Add page below"
          disabled={!editable}
          onClick={() => addPageAfter(editor, pageIndex)}
        >
          <PlusSquare className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function AddPageButton({
  editor,
  editable,
}: {
  editor: Editor;
  editable: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="editor-add-page h-9 w-full justify-center gap-1.5 rounded-lg border-border/60 bg-muted/50 text-foreground shadow-sm transition-colors hover:bg-muted"
      aria-label="Add a new page at the end of the document"
      disabled={!editable}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() =>
        addPageAfter(editor, getPageRanges(editor.state.doc).length - 1)
      }
    >
      <Plus className="size-3.5" aria-hidden="true" />
      Add page
    </Button>
  );
}
