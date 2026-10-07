import type { PresenceUser } from "@/hooks/use-presence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  color,
  image,
  className,
}: {
  name: string;
  color: string;
  image?: string | null;
  className?: string;
}) {
  return (
    <Avatar
      title={name}
      className={cn("size-7 ring-2 ring-background", className)}
    >
      {image && (
        <AvatarImage src={image} alt={name} referrerPolicy="no-referrer" />
      )}
      <AvatarFallback
        style={{ backgroundColor: color, color: "#fff" }}
        className="text-xs font-semibold"
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

/** Compact stacked avatars for the header. */
export function PresenceAvatars({ users }: { users: PresenceUser[] }) {
  if (users.length === 0) return null;
  const shown = users.slice(0, 4);
  const extra = users.length - shown.length;

  return (
    <div
      className="flex items-center -space-x-2"
      aria-label={`${users.length} online`}
    >
      {shown.map((u) => (
        <UserAvatar
          key={u.id}
          name={u.isYou ? `${u.name} (you)` : u.name}
          color={u.color}
          image={u.avatar}
        />
      ))}
      {extra > 0 && (
        <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium ring-2 ring-background">
          +{extra}
        </div>
      )}
    </div>
  );
}

/** "Online now" list for the sidebar. */
export function CollaboratorsPanel({ users }: { users: PresenceUser[] }) {
  return (
    <section className="grid gap-3">
      <h2 className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Online now
        <span>{users.length}</span>
      </h2>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">Connecting…</p>
      ) : (
        <ul className="grid gap-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-2">
              <UserAvatar name={u.name} color={u.color} image={u.avatar} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {u.name}
                {u.isYou && (
                  <span className="text-muted-foreground"> (you)</span>
                )}
              </span>
              {u.connections > 1 && (
                <span className="text-xs text-muted-foreground">
                  {u.connections} tabs
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
