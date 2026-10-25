import type { DocumentSummary } from "@synodos/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteDocument } from "@/hooks/use-documents";

type Props = {
  doc: DocumentSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteDocumentDialog({ doc, open, onOpenChange }: Props) {
  const del = useDeleteDocument();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete “{doc.title}”?</DialogTitle>
          <DialogDescription>
            This permanently deletes the document for everyone it's shared with,
            including its content and version history. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={del.isPending}
            onClick={() =>
              del.mutate(doc.id, { onSuccess: () => onOpenChange(false) })
            }
          >
            {del.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
