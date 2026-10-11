import { Bell, Mail, Shield, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : source.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 mb-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and notifications</p>
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
              <p className="truncate text-sm font-medium text-muted-foreground">{user?.email}</p>
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
            <div className="group flex flex-col gap-1.5 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Display name
              </span>
              <span className="text-sm font-medium text-foreground">{user?.name ?? "Not set"}</span>
            </div>
            <div className="group flex flex-col gap-1.5 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </span>
              <span className="text-sm font-medium text-foreground">{user?.email ?? "Not set"}</span>
            </div>
          </CardContent>
        </Card>

        <Card id="notifications" className="rounded-xl border-border/50 bg-card/40 shadow-sm transition-all hover:border-border/80 hover:shadow-md">
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
                <p className="text-muted-foreground">Receive emails for document invitations and access changes.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-lg border border-border/40 bg-background/50 p-4 transition-colors hover:bg-muted/50">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Shield className="size-4" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">Security Notices</p>
                <p className="text-muted-foreground">Alerts for new sign-ins and critical account changes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
