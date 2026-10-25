import {
  Bell,
  FileText,
  LifeBuoy,
  LogOut,
  Search,
  Settings,
  Share2,
  Sparkles,
  User,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CreateDocumentButton } from "@/components/documents/create-document-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { clearOfflineData } from "@/lib/offline";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./user-avatar";
import { NotificationsDialog } from "./notifications-dialog";

const docsLinks = [
  { label: "My documents", href: "/dashboard/overview", icon: FileText },
  {
    label: "Shared with me",
    href: "/dashboard/overview?tab=shared",
    icon: Share2,
  },
];

const workspaceLinks = [
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

function useActiveHref() {
  const location = useLocation();
  return (href: string) => {
    const [path, query = ""] = href.split("?");
    if (location.pathname !== path) return false;
    if (!query) {
      return location.pathname === "/dashboard/overview"
        ? new URLSearchParams(location.search).get("tab") !== "shared"
        : true;
    }
    return location.search === `?${query}`;
  };
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof FileText;
  onNavigate?: () => void;
}) {
  const isActive = useActiveHref()(href);

  return (
    <Link
      to={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive &&
          "bg-sidebar-accent/70 text-sidebar-accent-foreground shadow-sm",
      )}
    >
      {isActive && (
        <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors duration-200",
          isActive
            ? "text-primary"
            : "text-muted-foreground group-hover:text-sidebar-accent-foreground",
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppSidebar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const user = session?.user;

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    await clearOfflineData();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className={cn(
        "flex h-full w-72 flex-col border-r border-border/50 bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <NotificationsDialog
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
      <div className="flex h-16 shrink-0 items-center gap-3 px-6 pt-2">
        <Link
          to="/dashboard/overview"
          onClick={onNavigate}
          className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" />
          </span>
          <span className="truncate text-base font-semibold tracking-tight">
            Synodos
          </span>
        </Link>
      </div>

      <div className="px-4 py-2">
        <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent/50 cursor-not-allowed">
          <Search className="size-4 opacity-50" />
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-70">
            Search...
          </span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2">
        <CreateDocumentButton
          className="h-9 w-full justify-start rounded-lg shadow-sm"
          onCreated={onNavigate}
        />
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto px-3 py-2">
        <section className="space-y-1.5">
          <h4 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Documents
          </h4>
          <div className="space-y-0.5">
            {docsLinks.map((item) => (
              <SidebarLink key={item.href} {...item} onNavigate={onNavigate} />
            ))}
          </div>
        </section>

        <section className="space-y-1.5">
          <h4 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Workspace
          </h4>
          <div className="space-y-0.5">
            {workspaceLinks.map((item) => (
              <SidebarLink key={item.href} {...item} onNavigate={onNavigate} />
            ))}
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="group relative flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Bell className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-sidebar-accent-foreground" />
              <span className="truncate">Notifications</span>
            </button>
          </div>
        </section>
      </nav>

      <div className="mt-auto border-t border-border/50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring">
            <UserAvatar
              name={user?.name}
              email={user?.email}
              image={user?.image}
              className="size-8 rounded-md border border-border/50"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-none">
                {user?.name ?? "Your profile"}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {user?.email ?? "Manage account"}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-[calc(var(--radix-dropdown-menu-trigger-width)+10px)] min-w-56 rounded-xl"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <UserAvatar
                name={user?.name}
                email={user?.email}
                image={user?.image}
                className="size-9 rounded-md border border-border/50"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <LifeBuoy className="mr-2 size-4" /> Help and feedback
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={signOut}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
