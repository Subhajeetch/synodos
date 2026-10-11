import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";
import { authClient } from "@/lib/auth-client";
import { NotificationToastListener } from "@/components/notification-toast-listener";

export function FullPageSpinner() {
  return (
    <div className="grid min-h-svh place-items-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// only logged in can get in
export function RequireAuth() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <>
      <NotificationToastListener />
      <Outlet />
    </>
  );
}

// logged in can pass to dash
export function PublicOnly() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  const reauthenticating =
    location.pathname === "/login" &&
    new URLSearchParams(location.search).get("reauth") === "1";
  if (session && !reauthenticating) {
    return <Navigate to="/dashboard/overview" replace />;
  }
  return <Outlet />;
}