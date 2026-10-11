import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Clock,
  Copy,
  Download,
  EllipsisVertical,
  Eye,
  FileText,
  History,
  Info,
  Inbox,
  Link2,
  MessageSquare,
  PanelRightClose,
  PencilLine,
  RotateCcw,
  Settings2,
  Share2,
  Trash2,
  X,
  type LucideIcon,
  CircleFadingPlus,
} from "lucide-react";
import {
  canManageMembers,
  MAX_DOCUMENT_MEMBERS,
  type DocumentMember,
  type DocumentRole,
  type DocumentJoinRequest,
  type DocumentInvitation,
  type DocumentSummary,
} from "@synodos/shared";
import { RoleBadge } from "@/components/documents/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useApproveJoinRequest,
  useDocumentMembers,
  useDocumentSharing,
  useRejectJoinRequest,
  useRevokeDocumentInvitation,
  useRemoveDocumentMember,
  useUpdateDocumentMemberRole,
} from "@/hooks/use-documents";
import type { PresenceUser } from "@/hooks/use-presence";
import { ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { TypingIndicator } from "./typing-indicator";

type ConfirmationAction =
  | {
      kind: "approve";
      request: DocumentJoinRequest;
      role: "editor" | "viewer";
    }
  | { kind: "reject"; request: DocumentJoinRequest }
  | { kind: "revoke"; invitation: DocumentInvitation }
  | { kind: "remove"; member: DocumentMember };

const UPCOMING_FEATURES: { icon: LucideIcon; title: string; hint: string }[] = [
  {
    icon: History,
    title: "Version history",
    hint: "Restore earlier snapshots and view audit log",
  },
  {
    icon: MessageSquare,
    title: "Inline comments",
    hint: "Leave feedback on selected text",
  },
  {
    icon: Download,
    title: "Export formats",
    hint: "Download as Markdown, HTML, or PDF",
  },
];

function permissionDescription(role: DocumentRole) {
  switch (role) {
    case "owner":
      return "Owns this document and can edit it, manage collaborators, and change access.";
    case "editor":
      return "Can edit the document and collaborate with others in real time.";
    case "viewer":
      return "Can read the document but cannot make changes.";
  }
}

export function EditorSidebar({
  role,
  users,
  doc,
  className,
  onClose,
}: {
  role: DocumentRole;
  users: PresenceUser[];
  doc: DocumentSummary;
  className?: string;
  onClose?: () => void;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(
    null,
  );
  const [openMemberMenu, setOpenMemberMenu] = useState<string | null>(null);
  const [openRoleMenu, setOpenRoleMenu] = useState<string | null>(null);
  const isOwner = canManageMembers(role);
  const {
    preferences: notificationPreferences,
    setSoundEnabled,
    setPopupEnabled,
    setAlwaysShowCursor,
    setCategoryPreference,
    setSoundVolume,
  } = useNotificationPreferences();

  const {
    data: members,
    isPending: membersPending,
    isError: membersError,
    refetch: refetchMembers,
  } = useDocumentMembers(doc.id, true);
  const {
    data: sharing,
    error: sharingLoadError,
    isPending: sharingPending,
    isError: sharingError,
    refetch: refetchSharing,
  } = useDocumentSharing(doc.id, canManageMembers(role));
  const removeMember = useRemoveDocumentMember(doc.id);
  const updateMemberRole = useUpdateDocumentMemberRole(doc.id);
  const approveRequest = useApproveJoinRequest(doc.id);
  const rejectRequest = useRejectJoinRequest(doc.id);
  const revokeInvitation = useRevokeDocumentInvitation(doc.id);

  const onlineUsersById = new Map(users.map((user) => [user.id, user]));
  const reservedIds = new Set([
    ...(members ?? []).map((member) => member.userId),
    ...(sharing?.invitations ?? []).map((invitation) => invitation.userId),
    ...(sharing?.requests ?? []).map((request) => request.userId),
  ]);
  const confirmationPending =
    removeMember.isPending ||
    approveRequest.isPending ||
    rejectRequest.isPending ||
    revokeInvitation.isPending;
  const retrySharing = () => {
    void refetchSharing();
  };
  const sharingErrorDescription =
    sharingLoadError instanceof ApiError
      ? sharingLoadError.status >= 500
        ? `The server returned an error (${sharingLoadError.status}).`
        : `${sharingLoadError.message} (HTTP ${sharingLoadError.status}).`
      : sharingLoadError instanceof Error
        ? sharingLoadError.message
        : "An unexpected error occurred while loading sharing details.";

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const input = document.createElement("textarea");
        input.value = window.location.href;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Clipboard copy is not available");
      }
      setCopiedLink(true);
      toast.success("Document link copied to clipboard");
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.warn("Could not copy document link:", error);
      toast.error("Failed to copy link");
    }
  };

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  function confirmAction() {
    if (!confirmation) return;
    const close = () => setConfirmation(null);
    if (confirmation.kind === "approve") {
      approveRequest.mutate(
        { requestId: confirmation.request.id, role: confirmation.role },
        { onSuccess: close },
      );
    } else if (confirmation.kind === "reject") {
      rejectRequest.mutate(confirmation.request, { onSuccess: close });
    } else if (confirmation.kind === "revoke") {
      revokeInvitation.mutate(confirmation.invitation, { onSuccess: close });
    } else {
      removeMember.mutate(confirmation.member, { onSuccess: close });
    }
  }

  const confirmationCopy = (() => {
    if (!confirmation) return null;
    if (confirmation.kind === "approve") {
      const roleLabel = confirmation.role === "editor" ? "Editor" : "Viewer";
      return {
        title: "Grant document access?",
        description: `${confirmation.request.name || confirmation.request.email} will join as a ${confirmation.role} and this seat will be reserved for them.`,
        action: `Grant as ${roleLabel}`,
        destructive: false,
      };
    }
    if (confirmation.kind === "reject") {
      return {
        title: "Decline this access request?",
        description: `${confirmation.request.name || confirmation.request.email} won’t be able to access this document. They can contact you if they need another review.`,
        action: "Decline request",
        destructive: true,
      };
    }
    if (confirmation.kind === "revoke") {
      return {
        title: "Revoke this invitation?",
        description: `The pending invitation sent to ${confirmation.invitation.email} will be removed.`,
        action: "Revoke invitation",
        destructive: true,
      };
    }
    return {
      title: "Remove this collaborator?",
      description: `${confirmation.member.name || confirmation.member.email} will lose access to this document and any active collaboration session.`,
      action: "Remove collaborator",
      destructive: true,
    };
  })();
  const approvalConfirmation =
    confirmation?.kind === "approve" ? confirmation : null;

  return (
    <aside
      className={cn(
        "editor-sidebar flex h-full flex-col overflow-hidden bg-background/95 backdrop-blur transition-all duration-200",
        className,
      )}
    >
      {/* Tabs navigation */}
      <Tabs
        defaultValue="people"
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b border-border/50 px-4 pt-2 pb-2 flex items-center gap-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted/60">
            <TabsTrigger value="people" className="text-xs">
              Collaborators ({members?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              Share & Info
            </TabsTrigger>
          </TabsList>

          {onClose && (
            <Button
              variant="outline"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <PanelRightClose className="size-4" />
            </Button>
          )}
        </div>

        {/* Tab 1: People & Collaborators */}
        <TabsContent
          value="people"
          className="flex flex-1 flex-col overflow-y-auto p-4 mt-0"
        >
          {/* Real-time Online Presence */}
          <section className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ">
                Collaborators ({members?.length ?? 0})
              </h2>
            </div>

            {membersPending ? (
              <div className="rounded-lg border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
                Loading collaborators…
              </div>
            ) : membersError && !members ? (
              <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs">
                <p className="text-muted-foreground">
                  Collaborators could not be loaded.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => void refetchMembers()}
                >
                  Try again
                </Button>
              </div>
            ) : !members?.length ? (
              <p className="rounded-lg border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                No collaborators have access to this document.
              </p>
            ) : (
              <div className="space-y-1.5">
                {members.map((member) => {
                  const activeUser = onlineUsersById.get(member.userId);
                  const displayName = member.name || member.email;
                  const online = Boolean(activeUser);
                  const avatarImage = member.image ?? activeUser?.avatar;

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/60 p-2.5 transition-colors hover:bg-card"
                    >
                      <div className="relative">
                        <Avatar
                          className={cn(
                            "size-8 ring-2 ring-background",
                            !online && "grayscale opacity-60",
                          )}
                        >
                          {avatarImage && (
                            <AvatarImage
                              src={avatarImage}
                              alt={displayName}
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <AvatarFallback
                            style={{
                              backgroundColor: activeUser?.color ?? "#737373",
                              color: "#fff",
                            }}
                            className="text-xs font-semibold"
                          >
                            {displayName.trim().charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                          <AvatarBadge
                            aria-label={online ? "Online" : "Offline"}
                            title={online ? "Online" : "Offline"}
                            className={cn(
                              "border-2 border-background",
                              online ? "bg-emerald-500" : "bg-muted-foreground",
                            )}
                          />
                        </Avatar>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium text-foreground">
                            {displayName}
                          </span>
                          {activeUser?.isYou && (
                            <Badge
                              variant="secondary"
                              className="px-1.5 py-0 text-[10px] font-normal leading-none"
                            >
                              You
                            </Badge>
                          )}
                        </div>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {activeUser
                            ? activeUser.connections > 1
                              ? `${activeUser.connections} tabs active`
                              : "Active now"
                            : "Offline"}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <HoverCard>
                          <HoverCardTrigger
                            render={
                              <button
                                type="button"
                                className={cn(
                                  "flex items-center justify-center overflow-hidden rounded-full transition-[width] duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
                                  activeUser?.isTyping ? "w-20" : "w-14",
                                )}
                                aria-label={`${displayName}: ${member.role} permission details${activeUser?.isTyping ? ", typing" : ""}`}
                              />
                            }
                          >
                            <RoleBadge role={member.role} />
                            {activeUser?.isTyping && <TypingIndicator />}
                          </HoverCardTrigger>
                          <HoverCardContent
                            side="left"
                            align="center"
                            className="space-y-2"
                          >
                            <div>
                              <p className="font-medium text-foreground">
                                {displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <RoleBadge role={member.role} />
                              <span className="text-xs text-muted-foreground">
                                {permissionDescription(member.role)}
                              </span>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        {isOwner && member.role !== "owner" && (
                          <Popover
                            open={openMemberMenu === member.userId}
                            onOpenChange={(open) => {
                              setOpenMemberMenu(open ? member.userId : null);
                              if (!open) setOpenRoleMenu(null);
                            }}
                          >
                            <PopoverTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-muted-foreground"
                                  title={`Actions for ${displayName}`}
                                  aria-label={`Actions for ${displayName}`}
                                  disabled={
                                    confirmationPending ||
                                    updateMemberRole.isPending
                                  }
                                />
                              }
                            >
                              <EllipsisVertical
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            </PopoverTrigger>
                            <PopoverContent
                              side="bottom"
                              align="end"
                              className="w-48 gap-1 p-1.5"
                            >
                              <Popover
                                open={openRoleMenu === member.userId}
                                onOpenChange={(open) =>
                                  setOpenRoleMenu(open ? member.userId : null)
                                }
                              >
                                <PopoverTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      className="h-9 w-full justify-start rounded-lg px-2 text-xs"
                                      disabled={
                                        confirmationPending ||
                                        updateMemberRole.isPending
                                      }
                                    />
                                  }
                                >
                                  <PencilLine
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  Change role
                                  <ChevronRight
                                    className="ml-auto size-3.5"
                                    aria-hidden="true"
                                  />
                                </PopoverTrigger>
                                <PopoverContent
                                  side="left"
                                  align="start"
                                  className="w-40 gap-1 p-1.5"
                                >
                                  {(["editor", "viewer"] as const).map(
                                    (memberRole) => (
                                      <Button
                                        key={memberRole}
                                        variant="ghost"
                                        className="h-9 w-full justify-start rounded-lg px-2 text-xs capitalize"
                                        disabled={
                                          member.role === memberRole ||
                                          updateMemberRole.isPending
                                        }
                                        onClick={() => {
                                          setOpenRoleMenu(null);
                                          setOpenMemberMenu(null);
                                          updateMemberRole.mutate({
                                            userId: member.userId,
                                            role: memberRole,
                                          });
                                        }}
                                      >
                                        {memberRole === "editor" ? (
                                          <PencilLine
                                            className="size-3.5"
                                            aria-hidden="true"
                                          />
                                        ) : (
                                          <Eye
                                            className="size-3.5"
                                            aria-hidden="true"
                                          />
                                        )}
                                        {memberRole}
                                        {member.role === memberRole && (
                                          <span
                                            className="ml-auto size-2 rounded-full bg-emerald-500"
                                            aria-label="Current role"
                                            title="Current role"
                                          />
                                        )}
                                      </Button>
                                    ),
                                  )}
                                </PopoverContent>
                              </Popover>
                              <Button
                                variant="ghost"
                                className="h-9 w-full justify-start rounded-lg px-2 text-xs text-destructive hover:text-destructive"
                                disabled={
                                  confirmationPending ||
                                  updateMemberRole.isPending
                                }
                                onClick={() => {
                                  setOpenMemberMenu(null);
                                  setConfirmation({
                                    kind: "remove",
                                    member,
                                  });
                                }}
                              >
                                <Trash2
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                Remove collaborator
                              </Button>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-auto space-y-3 rounded-xl bg-card/50 md:bg-muted/20 p-3 mb-14 sm:mb-0 ">
            <div className="flex items-center gap-2">
              <Settings2 className="size-3.5 text-muted-foreground" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Settings
              </h3>
            </div>
            <div className="divide-y divide-border/50 overflow-hidden rounded-lg bg-card/70">
              <label
                htmlFor="collaborator-notification-sound"
                className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-card"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    Notification sound
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Play a sound when collaborators join or leave.
                  </span>
                </span>
                <Switch
                  id="collaborator-notification-sound"
                  checked={notificationPreferences.soundEnabled}
                  onCheckedChange={setSoundEnabled}
                  aria-label="Notification sound"
                />
              </label>
              <label
                htmlFor="collaborator-notification-popup"
                className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-card"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    Notification pop-up
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Show a pop-up for collaborator activity.
                  </span>
                </span>
                <Switch
                  id="collaborator-notification-popup"
                  checked={notificationPreferences.popupEnabled}
                  onCheckedChange={setPopupEnabled}
                  aria-label="Notification pop-up"
                />
              </label>
              <label
                htmlFor="notification-presence-category"
                className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-card"
              >
                <span className="text-sm font-medium text-foreground">Presence alerts</span>
                <Switch
                  id="notification-presence-category"
                  checked={notificationPreferences.categories.presence}
                  onCheckedChange={(value) => setCategoryPreference("presence", value)}
                />
              </label>
              {isOwner && (
                <label
                  htmlFor="notification-access-category"
                  className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-card"
                >
                  <span className="text-sm font-medium text-foreground">Access alerts</span>
                  <Switch
                    id="notification-access-category"
                    checked={notificationPreferences.categories.access}
                    onCheckedChange={(value) => setCategoryPreference("access", value)}
                  />
                </label>
              )}
              <label
                htmlFor="notification-volume"
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <span className="text-sm font-medium text-foreground">Sound volume</span>
                <input
                  id="notification-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={notificationPreferences.soundVolume}
                  onChange={(event) => setSoundVolume(Number(event.currentTarget.value))}
                  aria-valuetext={`${Math.round(notificationPreferences.soundVolume * 100)} percent`}
                  className="w-24 accent-primary"
                />
              </label>
              <label
                htmlFor="collaborator-always-show-cursor"
                className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-card"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    Always show cursor
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Keep collaborator cursor labels visible while they are in
                    the document.
                  </span>
                </span>
                <Switch
                  id="collaborator-always-show-cursor"
                  checked={notificationPreferences.alwaysShowCursor}
                  onCheckedChange={setAlwaysShowCursor}
                  aria-label="Always show cursor"
                />
              </label>
            </div>
          </section>
        </TabsContent>

        {/* Tab 2: Share & Document Settings */}
        <TabsContent
          value="settings"
          className="flex-1 overflow-y-auto p-4 space-y-6 mt-0"
        >
          {/* Quick Share Link */}
          <section className="space-y-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Share2 className="size-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">
                Link Sharing
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A link alone doesn’t grant access. Invite collaborators or review
              their requests below.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  typeof window !== "undefined" ? window.location.href : ""
                }
                className="h-8 font-mono text-[11px] bg-muted/30"
              />
              <Button
                size="sm"
                variant={copiedLink ? "secondary" : "default"}
                onClick={handleCopyLink}
                className="h-8 shrink-0 px-3 text-xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="mr-1.5 size-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </section>

          {isOwner && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex gap-2 items-center">
                  <CircleFadingPlus size={16} />
                  Pending access
                </h3>
                <Badge variant="outline" className="text-[11px]">
                  {reservedIds.size}/{MAX_DOCUMENT_MEMBERS}
                </Badge>
              </div>

              {sharingPending ? (
                <p className="text-xs text-muted-foreground">
                  Loading pending access…
                </p>
              ) : sharingError && !sharing ? (
                <div
                  role="alert"
                  className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs"
                >
                  <p className="font-medium text-foreground">
                    Pending access couldn’t be loaded.
                  </p>
                  <p>{sharingErrorDescription}</p>
                  {sharingLoadError instanceof ApiError &&
                    sharingLoadError.code && (
                      <p className="font-mono text-[10px] opacity-80">
                        Error code: {sharingLoadError.code}
                      </p>
                    )}
                  <p>
                    No invitation or request was changed. Retry to load the
                    latest information.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={retrySharing}
                  >
                    Try again
                  </Button>
                </div>
              ) : !sharing ? (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>Pending access is temporarily unavailable.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={retrySharing}
                  >
                    Try again
                  </Button>
                </div>
              ) : (
                <>
                  {sharingError && (
                    <div
                      role="alert"
                      className="flex items-start justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          Refresh failed; showing the last loaded information.
                        </p>
                        <p className="text-muted-foreground">
                          {sharingErrorDescription}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0"
                        onClick={retrySharing}
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                  {!sharing.requests.length && !sharing.invitations.length ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center">
                      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Inbox className="size-4" aria-hidden="true" />
                      </span>
                      <p className="text-xs font-medium text-foreground">
                        No requests received or invitations sent
                      </p>
                      <p className="max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">
                        New invitations you send and access requests awaiting
                        your review will appear here.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-foreground">
                          Join requests ({sharing?.requests.length ?? 0})
                        </h4>
                        {!sharing?.requests.length ? (
                          <p className="text-xs text-muted-foreground">
                            No one is waiting for access.
                          </p>
                        ) : (
                          sharing.requests.map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 p-2"
                            >
                              <Avatar className="size-8 shrink-0">
                                {request.image && (
                                  <AvatarImage
                                    src={request.image}
                                    alt={request.name || request.email}
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <AvatarFallback className="text-xs">
                                  {(request.name || request.email)
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">
                                  {request.name || request.email}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {request.email}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                aria-label={`Grant access to ${request.name || request.email}`}
                                title="Grant access"
                                disabled={confirmationPending}
                                onClick={() =>
                                  setConfirmation({
                                    kind: "approve",
                                    request,
                                    role: "viewer",
                                  })
                                }
                              >
                                <Check className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-destructive"
                                aria-label={`Decline request from ${request.name || request.email}`}
                                title="Decline request"
                                disabled={confirmationPending}
                                onClick={() =>
                                  setConfirmation({ kind: "reject", request })
                                }
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-foreground">
                          Invitations not yet accepted (
                          {sharing?.invitations.length ?? 0})
                        </h4>
                        {!sharing?.invitations.length ? (
                          <p className="text-xs text-muted-foreground">
                            No pending invitations.
                          </p>
                        ) : (
                          sharing.invitations.map((invitation) => (
                            <div
                              key={invitation.id}
                              className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 p-2"
                            >
                              <Avatar className="size-8 shrink-0">
                                {invitation.image && (
                                  <AvatarImage
                                    src={invitation.image}
                                    alt={invitation.name || invitation.email}
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <AvatarFallback className="text-xs">
                                  {(invitation.name || invitation.email)
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">
                                  {invitation.name || invitation.email}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {invitation.email} · {invitation.role}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={`Revoke invitation for ${invitation.email}`}
                                title="Revoke invitation"
                                disabled={confirmationPending}
                                onClick={() =>
                                  setConfirmation({
                                    kind: "revoke",
                                    invitation,
                                  })
                                }
                              >
                                <RotateCcw className="size-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {/* Document Metadata */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info size={16} />
              Document Details
            </h3>
            <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5" /> Title
                </span>
                <span className="font-medium text-foreground truncate max-w-[160px]">
                  {doc.title}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5" /> Last Modified
                </span>
                <span className="text-foreground">
                  {timeAgo(doc.updatedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                <span className="text-muted-foreground">Document ID</span>
                <span className="font-mono text-muted-foreground text-[10px]">
                  {doc.id.slice(0, 8)}…
                </span>
              </div>
            </div>
          </section>

          {/* Future Roadmap / Settings */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Link2 size={16} />
                Coming Soon
              </h3>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 font-normal"
              >
                Roadmap
              </Badge>
            </div>

            <div className="grid gap-2">
              {UPCOMING_FEATURES.map(({ icon: Icon, title, hint }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 transition-colors hover:border-border hover:bg-muted/40"
                >
                  <div className="mt-0.5 rounded-md bg-muted p-1 text-muted-foreground">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground leading-none">
                        {title}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 text-muted-foreground"
                      >
                        Soon
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                      {hint}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !confirmationPending) setConfirmation(null);
        }}
      >
        {confirmationCopy && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmationCopy.title}</DialogTitle>
              <DialogDescription>
                {confirmationCopy.description}
              </DialogDescription>
            </DialogHeader>
            {approvalConfirmation && (
              <div
                role="group"
                aria-label="Choose document access role"
                className="grid grid-cols-2 gap-2"
              >
                <Button
                  type="button"
                  aria-pressed={approvalConfirmation.role === "editor"}
                  onClick={() =>
                    setConfirmation({ ...approvalConfirmation, role: "editor" })
                  }
                  className={
                    approvalConfirmation.role === "editor"
                      ? "bg-primary/20 hover:bg-primary/30"
                      : "bg-muted hover:bg-muted/80"
                  }
                  disabled={confirmationPending}
                >
                  <PencilLine className="size-4" aria-hidden="true" />
                  Editor
                </Button>
                <Button
                  type="button"
                  aria-pressed={approvalConfirmation.role === "viewer"}
                  onClick={() =>
                    setConfirmation({ ...approvalConfirmation, role: "viewer" })
                  }
                  className={
                    approvalConfirmation.role === "viewer"
                      ? "bg-primary/20 hover:bg-primary/30"
                      : "bg-muted hover:bg-muted/80"
                  }
                  disabled={confirmationPending}
                >
                  <Eye className="size-4" aria-hidden="true" />
                  Viewer
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmation(null)}
                disabled={confirmationPending}
              >
                Cancel
              </Button>
              <Button
                variant={
                  confirmationCopy.destructive ? "destructive" : "default"
                }
                onClick={confirmAction}
                disabled={confirmationPending}
              >
                {confirmationPending ? "Working…" : confirmationCopy.action}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </aside>
  );
}
