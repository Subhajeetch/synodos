import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Bell,
  LoaderCircle,
  Mail,
  Pencil,
  Shield,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { api } from "@/lib/api";

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    const first = Array.from(parts[0] ?? "")[0] ?? "";
    const second = Array.from(parts[1] ?? "")[0] ?? "";
    return `${first}${second}`.toUpperCase();
  }
  return Array.from(source).slice(0, 2).join("").toUpperCase();
}

function hasControlCharacters(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

export default function ProfilePage() {
  const { data: session, refetch } = authClient.useSession();
  const user = session?.user;
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 mb-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Profile & Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account preferences and notifications
        </p>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <div className="relative flex flex-col gap-6 p-6 pt-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-5">
            <Avatar className="size-20 rounded-xl border-4 border-background shadow-md">
              {user?.image && (
                <AvatarImage
                  src={user.image}
                  alt={user.name ?? "Profile picture"}
                  referrerPolicy="no-referrer"
                  className="rounded-xl"
                />
              )}
              <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/90 to-primary text-2xl font-semibold text-primary-foreground">
                {getInitials(user?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 pb-1">
              <h2 className="truncate text-2xl font-bold tracking-tight text-foreground">
                {user?.name ?? "Your profile"}
              </h2>
              <p className="truncate text-sm font-medium text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border-border/50 bg-card/40 shadow-sm transition-all hover:border-border/80 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <UserRound className="size-5 text-primary" /> Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <button
              type="button"
              onClick={() => setIsNameDialogOpen(true)}
              aria-label="Edit display name"
              className="group flex w-full items-center justify-between gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Display name
                </span>
                <span className="truncate text-sm font-medium text-foreground">
                  {user?.name ?? "Not set"}
                </span>
              </span>
              <Pencil
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            </button>
            <div className="group flex flex-col gap-1.5 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </span>
              <span className="text-sm font-medium text-foreground">
                {user?.email ?? "Not set"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          id="notifications"
          className="rounded-xl border-border/50 bg-card/40 shadow-sm transition-all hover:border-border/80 hover:shadow-md"
        >
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <Bell className="size-5 text-primary" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-4 rounded-lg border border-border/40 bg-background/50 p-4 transition-colors hover:bg-muted/50">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Mail className="size-4" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">Email Updates</p>
                <p className="text-muted-foreground">
                  Receive emails for document invitations and access changes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-lg border border-border/40 bg-background/50 p-4 transition-colors hover:bg-muted/50">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Shield className="size-4" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">Security Notices</p>
                <p className="text-muted-foreground">
                  Alerts for new sign-ins and critical account changes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {isNameDialogOpen && (
        <EditDisplayNameDialog
          currentName={user?.name ?? ""}
          onOpenChange={setIsNameDialogOpen}
          refreshSession={() => void refetch()}
        />
      )}
    </div>
  );
}

function EditDisplayNameDialog({
  currentName,
  onOpenChange,
  refreshSession,
}: {
  currentName: string;
  onOpenChange: (open: boolean) => void;
  refreshSession: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [validationError, setValidationError] = useState<string | null>(null);
  const hasChanges = name.trim() !== currentName.trim();
  const updateName = useMutation({
    mutationFn: (updatedName: string) =>
      api<{ name: string }>("/api/users/me", {
        method: "PATCH",
        json: { name: updatedName },
      }),
    onSuccess: () => {
      toast.success("Display name updated");
      refreshSession();
      onOpenChange(false);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 80) {
      setValidationError("Display name must be between 1 and 80 characters.");
      return;
    }
    if (hasControlCharacters(trimmedName)) {
      setValidationError("Display name cannot contain control characters.");
      return;
    }
    setValidationError(null);
    updateName.mutate(trimmedName);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!updateName.isPending) onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Edit display name</DialogTitle>
            <DialogDescription>
              This name will be shown across your account.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="profile-display-name">Display name</Label>
            <Input
              id="profile-display-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setValidationError(null);
              }}
              maxLength={80}
              autoComplete="name"
              autoFocus
              aria-invalid={Boolean(validationError || updateName.error)}
              aria-describedby={
                validationError || updateName.error
                  ? "profile-display-name-error"
                  : undefined
              }
            />
            {(validationError || updateName.error) && (
              <p
                id="profile-display-name-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {validationError ?? updateName.error?.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateName.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || updateName.isPending}
            >
              {updateName.isPending && (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              )}
              {updateName.isPending ? "Updating…" : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
