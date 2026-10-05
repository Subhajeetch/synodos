import { LogOut } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export function AppLayout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  async function signOut() {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/dashboard/overview" className="text-lg font-semibold tracking-tight">
            Synodos
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent">
              <span className="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="hidden sm:inline">{user?.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}