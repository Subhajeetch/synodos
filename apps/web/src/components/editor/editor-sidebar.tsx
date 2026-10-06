import { useState } from "react";
import {
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  History,
  Info,
  Link2,
  MessageSquare,
  PanelRightClose,
  Share2,
  Trash2,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { canManageMembers, MAX_DOCUMENT_MEMBERS, type DocumentRole, type DocumentSummary } from "@synodos/shared";
import { RoleBadge } from "@/components/documents/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAddDocumentMember,
  useDocumentMembers,
  useRemoveDocumentMember,
} from "@/hooks/use-documents";
import type { PresenceUser } from "@/hooks/use-presence";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { UserAvatar } from "./presence";

const UPCOMING_FEATURES: { icon: LucideIcon; title: string; hint: string }[] = [
  { icon: History, title: "Version history", hint: "Restore earlier snapshots and view audit log" },
  { icon: MessageSquare, title: "Inline comments", hint: "Leave feedback on selected text" },
  { icon: Download, title: "Export formats", hint: "Download as Markdown, HTML, or PDF" },
];

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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");

  const { data: members = [], isPending: membersPending } = useDocumentMembers(doc.id);
  const addMember = useAddDocumentMember(doc.id);
  const removeMember = useRemoveDocumentMember(doc.id);

  const isOwner = canManageMembers(role);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Document link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    addMember.mutate(
      { email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail("");
        },
      },
    );
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden bg-background/95 backdrop-blur transition-all duration-200",
        className,
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Users className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Document Hub
          </span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {users.length} online
          </span>
        </div>

        {onClose && (
          <Button
            variant="ghost"
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

      {/* Tabs navigation */}
      <Tabs defaultValue="people" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border/50 px-4 pt-2 pb-2">
          <TabsList className="grid w-full grid-cols-2 bg-muted/60">
            <TabsTrigger value="people" className="text-xs">
              Collaborators ({users.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              Share & Info
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: People & Collaborators */}
        <TabsContent value="people" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
          {/* Real-time Online Presence */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                Active Now ({users.length})
              </h2>
              <span className="text-[11px] text-muted-foreground">Real-time sync</span>
            </div>

            {users.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                <div className="size-2 animate-ping rounded-full bg-amber-500" />
                Connecting to live presence…
              </div>
            ) : (
              <div className="space-y-1.5">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/60 p-2.5 transition-colors hover:bg-card"
                  >
                    <div className="relative">
                      <UserAvatar name={u.name} color={u.color} className="size-8 text-xs shadow-sm ring-2 ring-background" />
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-foreground">
                          {u.name}
                        </span>
                        {u.isYou && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal leading-none">
                            You
                          </Badge>
                        )}
                      </div>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {u.connections > 1 ? `${u.connections} tabs active` : "Active editor"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Document Access Role */}
          <section className="space-y-2.5 rounded-xl border border-border/50 bg-muted/20 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Your permission</span>
              <RoleBadge role={role} />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {role === "owner"
                ? "You own this document and have full control to edit and manage members."
                : role === "editor"
                  ? "You have full editing and collaboration rights in real time."
                  : "You have view-only access to this document."}
            </p>
          </section>

          {/* Members / Invites Management */}
          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Invited Members
            </h2>

            {/* Invite input for owners */}
            {isOwner && (
              <form onSubmit={handleInvite} className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {members.length}/{MAX_DOCUMENT_MEMBERS} members
              </p>
                <div className="flex gap-1.5">
                  <Input
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-8 text-xs"
                    disabled={addMember.isPending}
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    disabled={addMember.isPending}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 w-full text-xs font-medium"
                  disabled={addMember.isPending || !inviteEmail.trim() || members.length >= MAX_DOCUMENT_MEMBERS}
                >
                  <UserPlus className="mr-1.5 size-3" />
                  {addMember.isPending ? "Inviting…" : "Invite Member"}
                </Button>
              </form>
            )}

            {/* Members List */}
            {membersPending ? (
              <div className="text-center py-2 text-xs text-muted-foreground">Loading members…</div>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No external members invited yet. Share the link below to invite teammates.
              </p>
            ) : (
              <div className="space-y-1.5">
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/40 p-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{member.name || member.email}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {member.role}
                      </Badge>
                      {isOwner && member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember.mutate(member.userId)}
                          title="Remove member"
                          disabled={removeMember.isPending}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* Tab 2: Share & Document Settings */}
        <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
          {/* Quick Share Link */}
          <section className="space-y-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Share2 className="size-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">Link Sharing</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Anyone with this document link and access to the workspace can collaborate with you.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={typeof window !== "undefined" ? window.location.href : ""}
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

          {/* Document Metadata */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info className="size-3.5" />
              Document Details
            </h3>
            <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5" /> Title
                </span>
                <span className="font-medium text-foreground truncate max-w-[160px]">{doc.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5" /> Last Modified
                </span>
                <span className="text-foreground">{timeAgo(doc.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                <span className="text-muted-foreground">Document ID</span>
                <span className="font-mono text-muted-foreground text-[10px]">{doc.id.slice(0, 8)}…</span>
              </div>
            </div>
          </section>

          {/* Future Roadmap / Settings */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Link2 className="size-3.5" />
                Coming Soon
              </h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
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
                      <p className="text-xs font-medium text-foreground leading-none">{title}</p>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                        Soon
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
