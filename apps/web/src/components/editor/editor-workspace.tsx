import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, PanelRight, UserPlus, Users } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import {
  useHocuspocusEvent,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react";
import {
  canEdit,
  canManageMembers,
  MAX_DOCUMENT_MEMBERS,
  type DocumentSummary,
} from "@synodos/shared";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  documentKeys,
  notifyAccessRequest,
  notifyMemberJoined,
  notifyPresenceChange,
  useDocumentMembers,
  useDocumentSharing,
} from "@/hooks/use-documents";
import { useOfflinePersistence } from "@/hooks/use-offline-persistence";
import { usePresence } from "@/hooks/use-presence";
import { authClient } from "@/lib/auth-client";
import { userColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { ConnectionStatus } from "./connection-status";
import { EditorSidebar } from "./editor-sidebar";
import { EditorToolbar } from "./editor-toolbar";
import { InviteMemberDialog } from "./invite-member-dialog";
import { PresenceAvatars } from "./presence";
import { SyncErrorBanner } from "./sync-error-banner";
import { TitleInput } from "./title-input";

import { useQueryClient } from "@tanstack/react-query";

/** Must be rendered inside <HocuspocusRoom>. */
export function EditorWorkspace({ doc }: { doc: DocumentSummary }) {
  const provider = useHocuspocusProvider();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  const [syncError, setSyncError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [retryingSync, setRetryingSync] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { savedLocally, clear } = useOfflinePersistence(
    provider.document,
    doc.id,
    userId,
  );
  const isOwner = canManageMembers(doc.role);
  const { data: members, isPending: membersPending } = useDocumentMembers(
    doc.id,
    isOwner,
  );
  const { data: sharing } = useDocumentSharing(doc.id, isOwner);
  const users = usePresence(userId);
  const previousOnlineUsers = useRef<Set<string>>(new Set());
  const previousMemberIds = useRef<Set<string>>(new Set());
  const previousRequestIds = useRef<Set<string>>(new Set());
  const initializedPresence = useRef(false);
  const initializedMembers = useRef(false);
  const initializedRequests = useRef(false);

  const queryClient = useQueryClient();

  useHocuspocusEvent("authenticationFailed", ({ reason }) => {
    console.warn("Collab authentication failed:", reason);
    setSyncError(reason);
    setRetryingSync(false);
  });
  useHocuspocusEvent("authenticated", () => {
    setSyncError(null);
    setRetryingSync(false);
    void queryClient.invalidateQueries({
      queryKey: documentKeys.detail(doc.id),
    });
  });

  const lostAccess = syncError === "Forbidden";
  const editable = canEdit(doc.role) && !lostAccess;
  const reservedCollaborators = new Set([
    ...(members ?? []).map((member) => member.userId),
    ...(sharing?.invitations ?? []).map((invitation) => invitation.userId),
    ...(sharing?.requests ?? []).map((request) => request.userId),
  ]).size;
  const memberLimitReached = reservedCollaborators >= MAX_DOCUMENT_MEMBERS;

  useEffect(() => {
    if (membersPending || !members) return;
    const onlineIds = new Set(
      users
        .filter((presenceUser) => !presenceUser.isYou)
        .map((user) => user.id),
    );
    if (!initializedPresence.current) {
      if (!users.some((presenceUser) => presenceUser.isYou)) return;

      const timeout = window.setTimeout(() => {
        previousOnlineUsers.current = onlineIds;
        initializedPresence.current = true;
      }, 800);
      return () => window.clearTimeout(timeout);
    }

    for (const userId of onlineIds) {
      if (previousOnlineUsers.current.has(userId)) continue;
      const member = members.find((item) => item.userId === userId);
      if (member) notifyPresenceChange(member, true);
    }
    for (const userId of previousOnlineUsers.current) {
      if (onlineIds.has(userId)) continue;
      const member = members.find((item) => item.userId === userId);
      if (member) notifyPresenceChange(member, false);
    }
    previousOnlineUsers.current = onlineIds;
  }, [members, membersPending, users]);

  useEffect(() => {
    if (!isOwner || membersPending || !members) return;
    const memberIds = new Set(members.map((member) => member.userId));
    if (!initializedMembers.current) {
      previousMemberIds.current = memberIds;
      initializedMembers.current = true;
      return;
    }
    for (const member of members) {
      if (!previousMemberIds.current.has(member.userId)) {
        notifyMemberJoined(member);
      }
    }
    previousMemberIds.current = memberIds;
  }, [isOwner, members, membersPending]);

  useEffect(() => {
    if (!sharing) return;
    const requestIds = new Set(sharing.requests.map((request) => request.id));
    if (!initializedRequests.current) {
      previousRequestIds.current = requestIds;
      initializedRequests.current = true;
      return;
    }
    for (const request of sharing.requests) {
      if (!previousRequestIds.current.has(request.id)) {
        notifyAccessRequest(request);
      }
    }
    previousRequestIds.current = requestIds;
  }, [sharing]);

  async function retrySync() {
    setRetryingSync(true);
    try {
      await provider.connect();
    } catch (error) {
      console.error("Could not reconnect to collaboration:", error);
      setSyncError("Connection failed. Please try again.");
      setRetryingSync(false);
    }
  }

  // Access revoked: don't keep a readable local copy around.
  useEffect(() => {
    if (lostAccess) {
      void clear().catch((error) => {
        console.error("Could not clear the offline document copy:", error);
      });
    }
  }, [lostAccess, clear]);

  useEffect(() => {
    document.title = `${doc.title} · Synodos`;
    return () => {
      document.title = "Synodos";
    };
  }, [doc.title]);

  const user = {
    id: userId ?? "anonymous", // `id` lets presence dedupe multiple tabs
    name: session?.user.name ?? "Anonymous",
    avatar: session?.user.image ?? null,
    color: userColor(userId ?? "anonymous"),
  };

  const editor = useEditor(
    {
      editable,
      extensions: [
        // Yjs handles undo/redo; TipTap's own history would fight it.
        StarterKit.configure({ undoRedo: false }),
        Placeholder.configure({ placeholder: "Start writing…" }),
        Collaboration.configure({ document: provider.document }),
        CollaborationCaret.configure({ provider, user }),
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-neutral max-w-none min-h-[70vh] text-neutral-950 focus:outline-none " +
            "prose-headings:text-neutral-950 prose-p:text-neutral-800 prose-strong:text-neutral-950 " +
            "prose-code:text-neutral-950 prose-code:before:content-none prose-code:after:content-none",
        },
      },
    },
    [provider],
  );

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b border-border/40 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to dashboard"
          className="text-muted-foreground hover:text-foreground"
          nativeButton={false}
          render={<Link to="/dashboard/overview" />}
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-2">
          <TitleInput key={doc.title} doc={doc} readOnly={!editable} />
          {!editable && (
            <Badge
              variant="secondary"
              className="px-2 font-medium bg-secondary/50 text-secondary-foreground/80 hover:bg-secondary/50"
            >
              View only
            </Badge>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block">
            <PresenceAvatars users={users} />
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <div className="h-4 w-px bg-border" />
            <ConnectionStatus savedLocally={savedLocally} />
          </div>
          <ThemeToggle />
          <div className="h-4 w-px bg-border/60" />
          <Button
            variant={sidebarOpen ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 gap-1.5 px-2.5 text-xs font-medium transition-colors",
              sidebarOpen && "bg-secondary text-foreground",
            )}
            onClick={() => setSidebarOpen((prev) => !prev)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            aria-label="Toggle document sidebar"
          >
            <Users className="size-3.5 text-primary" />
            <span className="font-semibold">{users.length}</span>
            <PanelRight
              className={cn(
                "size-3.5 transition-transform",
                !sidebarOpen && "opacity-60",
              )}
            />
          </Button>

          {canManageMembers(doc.role) && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className="inline-flex"
                    tabIndex={memberLimitReached ? 0 : undefined}
                    aria-label={
                      memberLimitReached
                        ? `Maximum of ${MAX_DOCUMENT_MEMBERS} collaborators reached`
                        : undefined
                    }
                  />
                }
              >
                <Button
                  className="h-8"
                  onClick={() => setInviteDialogOpen(true)}
                  disabled={memberLimitReached}
                >
                  <UserPlus className="size-4" />
                  Invite
                </Button>
              </TooltipTrigger>
              {memberLimitReached && (
                <TooltipContent>
                  Maximum of {MAX_DOCUMENT_MEMBERS} collaborators per document,
                  including the owner and pending invitations or requests.
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>
      </header>

      {inviteDialogOpen && (
        <InviteMemberDialog
          doc={doc}
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      )}

      {syncError && (
        <SyncErrorBanner
          reason={syncError}
          retrying={retryingSync}
          localCopyAvailable={savedLocally}
          onRetry={() => void retrySync()}
        />
      )}

      <EditorToolbar editor={editor} disabled={!editable} />

      <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/30 dark:bg-[#111113]">
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
          <div className="mx-auto min-h-[calc(100dvh-12rem)] max-w-4xl rounded-xl bg-white px-8 py-12 text-neutral-950 shadow-sm ring-1 ring-neutral-200/50 sm:px-12 lg:px-16 transition-shadow hover:shadow-md">
            <EditorContent editor={editor} />
          </div>
        </main>

        {sidebarOpen && (
          <EditorSidebar
            doc={doc}
            role={doc.role}
            users={users}
            onClose={() => setSidebarOpen(false)}
            className="fixed inset-y-14 right-0 z-30 w-full sm:static sm:inset-auto sm:w-80 md:w-88 border-l border-border/50 shrink-0 shadow-lg sm:shadow-none"
          />
        )}
      </div>
    </div>
  );
}
