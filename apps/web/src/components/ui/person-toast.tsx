import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PersonToastProps = {
  title: string;
  detail: string;
  name: string;
  image: string | null;
  tone: "success" | "info" | "warning" | "error";
  role?: "status" | "alert";
  people?: Array<{ name: string; image: string | null }>;
};

export function PersonToast({
  title,
  detail,
  name,
  image,
  tone,
  role = "status",
  people,
}: PersonToastProps) {
  const tones = {
    success: "border-emerald-500/50",
    info: "border-blue-500/50",
    warning: "border-amber-500/50",
    error: "border-rose-500/50",
  };
  const indicators = {
    success: "bg-emerald-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
  };

  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={`relative flex items-center gap-3 rounded-xl border bg-background p-3 shadow-2xl backdrop-blur-2xl ${tones[tone]}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${indicators[tone]}`}
      />
      <div className="flex shrink-0 -space-x-2">
        {(people?.slice(0, 3) ?? [{ name, image }]).map((person, index) => (
          <Avatar
            key={`${person.name}-${index}`}
            className="size-9 ring-2 ring-background/80"
          >
            {person.image && (
              <AvatarImage
                src={person.image}
                alt=""
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
              {person.name.trim().charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
