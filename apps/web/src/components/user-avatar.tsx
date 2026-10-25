import { cn } from "@/lib/utils";

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    const first = Array.from(parts[0] ?? "")[0] ?? "";
    const second = Array.from(parts[1] ?? "")[0] ?? "";
    return `${first}${second}`.toUpperCase();
  }
  return Array.from(source).slice(0, 2).join("").toUpperCase();
}

export function UserAvatar({
  name,
  email,
  image,
  className,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  className?: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? "User avatar"}
        className={cn(
          "size-9 rounded-full object-cover shadow-sm ring-1 ring-background/10",
          className,
        )}
      />
    );
  }
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
