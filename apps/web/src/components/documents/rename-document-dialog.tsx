import { useState } from "react";
import { updateDocumentSchema, type DocumentSummary } from "@synodos/shared";
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
import { Label } from "@/components/ui/label";
import { useRenameDocument } from "@/hooks/use-documents";

type Props = {
  doc: DocumentSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RenameDocumentDialog({ doc, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* The form is its own component so its state resets each time the dialog opens. */}
        <RenameForm doc={doc} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  doc,
  onDone,
}: {
  doc: DocumentSummary;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [error, setError] = useState<string | null>(null);
  const rename = useRenameDocument();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = updateDocumentSchema.safeParse({ title });
    if (!parsed.success) {
      setError("Title must be between 1 and 200 characters.");
      return;
    }
    if (parsed.data.title === doc.title) {
      onDone();
      return;
    }
    rename.mutate(
      { id: doc.id, title: parsed.data.title },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Rename document</DialogTitle>
        <DialogDescription>
          Everyone with access will see the new title.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="rename-title">Title</Label>
        <Input
          id="rename-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          maxLength={200}
          autoComplete="off"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={rename.isPending}>
          {rename.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
