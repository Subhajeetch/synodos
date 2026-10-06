import {
  useHocuspocusConnectionStatus,
  useHocuspocusSyncStatus,
} from "@hocuspocus/provider-react";
import { cn } from "@/lib/utils";

export function ConnectionStatus({ savedLocally }: { savedLocally: boolean }) {
  const connection = useHocuspocusConnectionStatus();
  const sync = useHocuspocusSyncStatus();

  let label = "Synced";
  let dot = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
  let animate = false;

  if (connection === "disconnected") {
    label = savedLocally ? "Saved locally" : "Offline";
    dot = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
  } else if (connection === "connecting") {
    label = "Connecting…";
    dot = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
    animate = true;
  } else if (sync === "syncing") {
    label = "Saving…";
    dot = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
    animate = true;
  }

  return (
    <div
      className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex size-2 items-center justify-center">
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", dot, animate && "animate-ping")} />
        <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
      </div>
      {label}
    </div>
  );
}