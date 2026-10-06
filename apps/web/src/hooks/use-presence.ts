import { useMemo } from "react";
import { useHocuspocusAwareness } from "@hocuspocus/provider-react";

export type PresenceUser = {
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  color: string;
  isYou: boolean;
  isTyping?: boolean;
  connections: number;
};

type AwarenessUser = {
  id?: string;
  name?: string;
  email?: string | null;
  avatar?: string | null;
  color?: string;
  isTyping?: boolean;
};

export function usePresence(currentUserId: string | undefined): PresenceUser[] {
  const states = useHocuspocusAwareness();

  return useMemo(() => {
    const byId = new Map<string, PresenceUser>();
    for (const state of states) {
      const user = state.user as AwarenessUser | undefined;
      if (!user?.id) continue;

      const existing = byId.get(user.id);
      if (existing) {
        existing.connections += 1;
        if (user.isTyping) existing.isTyping = true;
        if (user.avatar) existing.avatar = user.avatar;
        if (user.name && existing.name === "Anonymous") existing.name = user.name;
      } else {
        byId.set(user.id, {
          id: user.id,
          name: user.name ?? "Anonymous",
          email: user.email ?? null,
          avatar: user.avatar ?? null,
          color: user.color ?? "#2563eb",
          isYou: user.id === currentUserId,
          isTyping: Boolean(user.isTyping),
          connections: 1,
        });
      }
    }
    return [...byId.values()].sort(
      (a, b) => Number(b.isYou) - Number(a.isYou) || a.name.localeCompare(b.name),
    );
  }, [states, currentUserId]);
}