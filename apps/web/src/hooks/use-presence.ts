import { useCallback, useRef, useSyncExternalStore } from "react";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";

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
  const provider = useHocuspocusProvider();
  const cache = useRef<{ currentUserId: string | undefined; users: PresenceUser[] }>({
    currentUserId,
    users: [],
  });
  const subscribe = useCallback(
    (listener: () => void) => {
      const awareness = provider.awareness;
      if (!awareness) return () => undefined;
      awareness.on("change", listener);
      return () => awareness.off("change", listener);
    },
    [provider],
  );
  const getSnapshot = useCallback(() => {
    const states = provider.awareness?.getStates().values() ?? [];
    const byId = new Map<string, PresenceUser>();
    for (const state of states) {
      const user = (state as { user?: AwarenessUser }).user;
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
    const next = [...byId.values()].sort(
      (a, b) => Number(b.isYou) - Number(a.isYou) || a.name.localeCompare(b.name),
    );
    const previous = cache.current;
    const unchanged =
      previous.currentUserId === currentUserId &&
      previous.users.length === next.length &&
      previous.users.every((user, index) => {
        const candidate = next[index];
        return (
          user.id === candidate?.id &&
          user.name === candidate.name &&
          user.email === candidate.email &&
          user.avatar === candidate.avatar &&
          user.color === candidate.color &&
          user.isYou === candidate.isYou &&
          user.isTyping === candidate.isTyping &&
          user.connections === candidate.connections
        );
      });
    if (unchanged) return previous.users;
    cache.current = { currentUserId, users: next };
    return next;
  }, [currentUserId, provider]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}