import { useState, type FormEvent } from "react";
import { Eye, Loader2, PencilLine, UserPlus } from "lucide-react";
import type { DocumentSummary } from "@synodos/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAddDocumentInvitation } from "@/hooks/use-documents";

type InviteRole = "editor" | "viewer";

export function InviteMemberDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: DocumentSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("editor");
  const addInvitation = useAddDocumentInvitation(doc.id);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || addInvitation.isPending) return;

    addInvitation.mutate(
      { email: normalizedEmail, role: inviteRole },
      {
        onSuccess: () => {
          setEmail("");
          setInviteRole("editor");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Invite a collaborator</DialogTitle>
            <DialogDescription>
              Add a teammate to “{doc.title}” and choose what they can do.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Input
              type="email"
              aria-label="Teammate email address"
              placeholder="teammate@company.com"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={addInvitation.isPending}
              autoFocus
            />

            <div
              role="group"
              aria-label="Choose collaborator permission"
              className="grid grid-cols-2 gap-2"
            >
              <Button
                type="button"
                aria-pressed={inviteRole === "editor"}
                onClick={() => setInviteRole("editor")}
                className={
                  inviteRole === "editor"
                    ? "bg-primary/20 hover:bg-primary/30 text-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground/90"
                }
                disabled={addInvitation.isPending}
              >
                <PencilLine className="size-4" aria-hidden="true" />
                Editor
              </Button>
              <Button
                type="button"
                aria-pressed={inviteRole === "viewer"}
                className={
                  inviteRole === "viewer"
                    ? "bg-primary/20 hover:bg-primary/30 text-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground/90"
                }
                onClick={() => setInviteRole("viewer")}
                disabled={addInvitation.isPending}
              >
                <Eye className="size-4" aria-hidden="true" />
                Viewer
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={addInvitation.isPending || !email.trim()}
            className="text-foreground"
          >
            {addInvitation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="size-4" aria-hidden="true" />
            )}
            {addInvitation.isPending ? "Inviting…" : "Invite Member"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
