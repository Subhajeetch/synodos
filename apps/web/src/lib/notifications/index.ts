export type PersonRef = {
  id?: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type NotificationPriority = "critical" | "high" | "normal" | "low";
export type NotificationCategory = "presence" | "access" | "system";
export type NotificationSound = "none" | "join" | "leave";

export type NotificationEvent =
  | {
      type: "presence.join";
      person: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "presence.leave";
      person: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "access.requested";
      person: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "access.request_declined";
      person: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "access.lost";
      person?: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "member.joined";
      person: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "member.removed";
      person: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "member.role_changed";
      person: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "invitation.sent";
      person: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "invitation.revoked";
      person: PersonRef;
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    }
  | {
      type: "system";
      priority: NotificationPriority;
      category: NotificationCategory;
      duration: number;
      sound: NotificationSound;
      dedupeKey: string;
      scope: string;
      title: string;
      detail: string;
    };

export const NOTIFICATION_POLICY: Record<
  NotificationEvent["type"],
  Omit<NotificationEvent, "person" | "title" | "detail" | "type">
> = {
  "presence.join": {
    priority: "normal",
    category: "presence",
    duration: 3500,
    sound: "join",
    dedupeKey: "presence.join",
    scope: "presence",
  },
  "presence.leave": {
    priority: "low",
    category: "presence",
    duration: 3500,
    sound: "leave",
    dedupeKey: "presence.leave",
    scope: "presence",
  },
  "access.requested": {
    priority: "high",
    category: "access",
    duration: 8000,
    sound: "none",
    dedupeKey: "access.requested",
    scope: "access",
  },
  "access.request_declined": {
    priority: "normal",
    category: "access",
    duration: 6000,
    sound: "none",
    dedupeKey: "access.request_declined",
    scope: "access",
  },
  "access.lost": {
    priority: "critical",
    category: "access",
    duration: 8000,
    sound: "none",
    dedupeKey: "access.lost",
    scope: "access",
  },
  "member.joined": {
    priority: "normal",
    category: "presence",
    duration: 4500,
    sound: "join",
    dedupeKey: "member.joined",
    scope: "members",
  },
  "member.removed": {
    priority: "high",
    category: "access",
    duration: 8000,
    sound: "none",
    dedupeKey: "member.removed",
    scope: "members",
  },
  "member.role_changed": {
    priority: "high",
    category: "access",
    duration: 7000,
    sound: "none",
    dedupeKey: "member.role_changed",
    scope: "members",
  },
  "invitation.sent": {
    priority: "normal",
    category: "access",
    duration: 5000,
    sound: "none",
    dedupeKey: "invitation.sent",
    scope: "access",
  },
  "invitation.revoked": {
    priority: "normal",
    category: "access",
    duration: 5000,
    sound: "none",
    dedupeKey: "invitation.revoked",
    scope: "access",
  },
  system: {
    priority: "normal",
    category: "system",
    duration: 5000,
    sound: "none",
    dedupeKey: "system",
    scope: "system",
  },
} as const;

export function normalizePerson(
  person: Partial<PersonRef> | undefined,
): PersonRef {
  return {
    id: person?.id,
    name: person?.name ?? null,
    email: person?.email ?? "Unknown user",
    image: person?.image ?? null,
  };
}

export function toEventKey(
  event: Pick<NotificationEvent, "type" | "scope"> & { person?: PersonRef },
) {
  const personId = event.person?.id ?? event.person?.email ?? "batch";
  return `${event.scope}:${event.type}:${personId}`;
}

export function shouldCoalesce(
  eventA: Pick<NotificationEvent, "type" | "scope">,
  eventB: Pick<NotificationEvent, "type" | "scope">,
) {
  return eventA.type === eventB.type && eventA.scope === eventB.scope;
}

export function dedupeNotifications(
  events: NotificationEvent[],
  windowMs = 1200,
) {
  const deduped: NotificationEvent[] = [];
  const lastSeen = new Map<string, number>();

  for (const event of events) {
    const key = toEventKey(event);
    const lastAt = lastSeen.get(key) ?? -Infinity;
    if (Date.now() - lastAt <= windowMs) continue;
    lastSeen.set(key, Date.now());
    deduped.push(event);
  }

  return deduped;
}

export function diffPresenceSnapshots(
  previous: { id: string }[],
  next: { id: string }[],
  currentUserId?: string,
) {
  const prev = new Set(
    previous.filter((user) => user.id !== currentUserId).map((user) => user.id),
  );
  const nextSet = new Set(
    next.filter((user) => user.id !== currentUserId).map((user) => user.id),
  );

  const joined = [...nextSet].filter((id) => !prev.has(id));
  const left = [...prev].filter((id) => !nextSet.has(id));

  return {
    joined,
    left,
  };
}
