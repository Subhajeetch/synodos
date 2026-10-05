import { authClient } from "@/lib/auth-client";

export function OverviewPage() {
  const { data: session } = authClient.useSession();
  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold">Welcome, {session?.user.name}</h1>
      <p className="text-muted-foreground">Your documents will appear here.</p>
    </div>
  );
}