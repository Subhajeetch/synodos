import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PersonToastProps = {
  title: string;
  detail: string;
  name: string;
  image: string | null;
  tone: "success" | "info" | "warning" | "error";
};

export function PersonToast({
  title,
  detail,
  name,
  image,
  tone,
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
      className={`relative flex items-center gap-3 rounded-xl border bg-background p-3 shadow-2xl backdrop-blur-2xl ${tones[tone]}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${indicators[tone]}`}
      />
      <Avatar className="size-9 shrink-0 ring-2 ring-background/80">
        {image && (
          <AvatarImage src={image} alt={name} referrerPolicy="no-referrer" />
        )}
        <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
          {name.trim().charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
