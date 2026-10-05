import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";
import { authClient } from "@/lib/auth-client";

export function FullPageSpinner() {
  return (
    <div className="grid min-h-svh place-items-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Only logged-in users get through; others go to /login. */
export function RequireAuth() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Login/signup pages: logged-in users get sent to the dashboard. */
export function PublicOnly() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <FullPageSpinner />;
  if (session) return <Navigate to="/dashboard/overview" replace />;
  return <Outlet />;
}