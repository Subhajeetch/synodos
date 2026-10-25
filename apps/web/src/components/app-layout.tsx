import { useState } from "react";
import { ChevronRight, Menu } from "lucide-react";
import { Outlet, useLocation } from "react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function useBreadcrumb() {
  const location = useLocation();
  const path = location.pathname;
  if (path.startsWith("/dashboard/overview")) return "Overview";
  if (path.startsWith("/dashboard/profile")) return "Profile";
  if (path.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const breadcrumb = useBreadcrumb();

  return (
    <div className="min-h-svh bg-background text-foreground md:pl-72">
      <AppSidebar className="fixed inset-y-0 left-0 z-30 hidden md:flex" />

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/40 bg-background/70 px-4 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-2">
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 md:hidden"
                  aria-label="Open navigation"
                />
              }
            >
              <Menu className="size-5" />
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              className="!left-0 !top-0 h-dvh max-w-80 !translate-x-0 !translate-y-0 rounded-none p-0 sm:max-w-80"
            >
              <DialogTitle className="sr-only">Navigation</DialogTitle>
              <AppSidebar onNavigate={() => setMobileOpen(false)} />
            </DialogContent>
          </Dialog>

          <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground md:flex">
            <span>Synodos</span>
            <ChevronRight className="size-4" />
            <span className="text-foreground">{breadcrumb}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
