import { cn } from "@/lib/utils";

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  name,
  email,
  className,
}: {
  name?: string | null;
  email?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary/90 to-primary text-xs font-medium text-primary-foreground shadow-sm ring-1 ring-background/10",
        className,
      )}
      aria-hidden
    >
      {initials(name, email)}
    </span>
  );
}
