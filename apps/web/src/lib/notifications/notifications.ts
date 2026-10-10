import { createElement } from "react";
import { toast } from "sonner";
import { PersonToast } from "@/components/ui/person-toast";
import {
  getNotificationPreferences,
  playPresenceSound,
} from "@/hooks/use-notification-preferences";

export type NotificationPerson = {
  id?: string;
  name: string | null;
  email: string;
  image: string | null;
};

type PersonEvent = {
  person: NotificationPerson;
  title: string;
  detail: string;
  tone: "success" | "info" | "warning" | "error";
  kind: string;
  category: "presence" | "access" | "system";
  scope: string;
  online?: boolean;
};

const DEDUPE_MS = 5000;
const COALESCE_MS = 150;
const MAX_COALESCE_MS = 350;
const pendingEvents: PersonEvent[] = [];
const delayedLeaves = new Map<
  string,
  { event: PersonEvent; timer: ReturnType<typeof setTimeout> }
>();
const lastShown = new Map<string, number>();
const scopedToastIds = new Map<string, Set<string>>();
const toastPriorities = new Map<string, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let groupStartedAt = 0;
let visibilityListener: (() => void) | null = null;
let lastSoundAt = 0;
let currentUserId: string | undefined;

export function setNotificationCurrentUser(userId: string | undefined) {
  currentUserId = userId;
}

function personKey(person: NotificationPerson) {
  return person.id || person.email;
}

function makeToastId(event: PersonEvent, suffix = personKey(event.person)) {
  return `${event.scope}:${event.kind}:${suffix}`;
}

function rememberToast(scope: string, id: string, priority: number) {
  if (priority <= 1) {
    for (const [existingId, existingPriority] of toastPriorities) {
      if (existingPriority < 3) continue;
      toast.dismiss(existingId);
      toastPriorities.delete(existingId);
      for (const ids of scopedToastIds.values()) ids.delete(existingId);
    }
  }
  const ids = scopedToastIds.get(scope) ?? new Set<string>();
  ids.add(id);
  scopedToastIds.set(scope, ids);
  toastPriorities.set(id, priority);
}

function playGroupSound(events: PersonEvent[]) {
  if (Date.now() - lastSoundAt < 700) return;
  const soundEvent = events.find((event) => event.online !== undefined);
  if (!soundEvent) return;
  lastSoundAt = Date.now();
  playPresenceSound(soundEvent.online === true);
}

function removeVisibilityListener() {
  if (visibilityListener) {
    document.removeEventListener("visibilitychange", visibilityListener);
    visibilityListener = null;
  }
}

function flushEvents() {
  flushTimer = null;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    if (!visibilityListener) {
      visibilityListener = () => {
        if (document.visibilityState !== "visible") return;
        removeVisibilityListener();
        flushEvents();
      };
      document.addEventListener("visibilitychange", visibilityListener);
    }
    return;
  }

  const now = Date.now();
  for (const [key, timestamp] of lastShown) {
    if (now - timestamp > DEDUPE_MS * 2) lastShown.delete(key);
  }
  const unique = pendingEvents.splice(0).filter((event) => {
    const key = makeToastId(event);
    const last = lastShown.get(key) ?? -Infinity;
    if (now - last < DEDUPE_MS) return false;
    lastShown.set(key, now);
    return true;
  });
  if (unique.length === 0) return;

  const preferences = getNotificationPreferences();
  const visible = unique.filter(
    (event) =>
      preferences.popupEnabled && preferences.categories[event.category],
  );
  if (preferences.soundEnabled && preferences.categories.presence) {
    playGroupSound(unique.filter((event) => event.category === "presence"));
  }
  const groups = new Map<string, PersonEvent[]>();
  for (const event of visible) {
    const key = `${event.scope}:${event.kind}`;
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }

  const orderedGroups = [...groups.values()].sort((a, b) => {
    const priority = (event: PersonEvent) =>
      event.category === "access" ? 1 : event.category === "system" ? 2 : 3;
    return priority(a[0]!) - priority(b[0]!);
  });
  const shownGroups = orderedGroups.slice(0, 3);
  for (const group of shownGroups) {
    const first = group[0];
    if (!first) continue;
    const names = group.map((event) => event.person.name || event.person.email);
    const title =
      names.length > 1
        ? `${names[0]} and ${names.length - 1} others`
        : first.title;
    const detail =
      names.length > 1
        ? `${names.length} collaborators updated in this document.`
        : first.detail;
    const id = makeToastId(first, names.length > 1 ? "batch" : undefined);
    rememberToast(
      first.scope,
      id,
      first.kind === "access-lost" ? 0 : first.category === "access" ? 1 : 3,
    );
    toast.custom(
      () =>
        createElement(PersonToast, {
          name: names[0] ?? first.person.email,
          image: first.person.image,
          title,
          detail,
          tone: first.tone,
          role: first.category === "access" ? "alert" : "status",
          people: group.map((event) => ({
            name: event.person.name || event.person.email,
            image: event.person.image,
          })),
        }),
      {
        id,
        duration: first.category === "access" ? 8000 : 3500,
        onDismiss: () => {
          scopedToastIds.get(first.scope)?.delete(id);
          toastPriorities.delete(id);
        },
        onAutoClose: () => {
          scopedToastIds.get(first.scope)?.delete(id);
          toastPriorities.delete(id);
        },
      },
    );
  }
  const overflowCount = orderedGroups.length - shownGroups.length;
  if (overflowCount > 0) {
    const first = orderedGroups[shownGroups.length]?.[0];
    if (first) {
      const id = `${first.scope}:digest:overflow`;
      rememberToast(first.scope, id, 2);
      toast.info(`+${overflowCount} more notifications`, {
        id,
        duration: 5000,
      });
    }
  }
}

function enqueue(event: PersonEvent) {
  const preferences = getNotificationPreferences();
  if (!preferences.categories[event.category]) return;
  if (
    !(preferences.popupEnabled && preferences.categories[event.category]) &&
    !(event.online !== undefined && preferences.soundEnabled)
  ) {
    return;
  }
  pendingEvents.push(event);
  const now = Date.now();
  if (groupStartedAt === 0) groupStartedAt = now;
  if (flushTimer) clearTimeout(flushTimer);
  const remainingMaxWait = Math.max(0, MAX_COALESCE_MS - (now - groupStartedAt));
  flushTimer = setTimeout(
    () => {
      groupStartedAt = 0;
      flushEvents();
    },
    Math.min(COALESCE_MS, remainingMaxWait),
  );
}

export function dismissNotificationScope(scope: string) {
  const ids = scopedToastIds.get(scope);
  ids?.forEach((id) => {
    toast.dismiss(id);
    toastPriorities.delete(id);
  });
  scopedToastIds.delete(scope);
  for (let index = pendingEvents.length - 1; index >= 0; index -= 1) {
    if (pendingEvents[index]?.scope === scope) pendingEvents.splice(index, 1);
  }
  for (const [key, delayed] of delayedLeaves) {
    if (!key.startsWith(`${scope}:`)) continue;
    clearTimeout(delayed.timer);
    delayedLeaves.delete(key);
  }
}

export function notifyPerson(
  person: NotificationPerson,
  title: string,
  detail: string,
  tone: "success" | "info" | "warning" | "error",
  scope = "global",
) {
  if (person.id && person.id === currentUserId) return;
  const access = /access|invitation|removed|permission|role/i.test(title);
  enqueue({
    person,
    title,
    detail,
    tone,
    kind: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    category: access ? "access" : "system",
    scope,
  });
}

export function notifyPresenceChange(
  person: NotificationPerson,
  online: boolean,
  scope = "global",
) {
  if (person.id && person.id === currentUserId) return;
  const name = person.name || person.email;
  const key = `${scope}:${personKey(person)}`;
  const event: PersonEvent = {
    person,
    title: online ? `${name} joined` : `${name} left`,
    detail: online ? "is now active in this document." : "is no longer active.",
    tone: online ? "success" : "info",
    kind: online ? "presence-join" : "presence-leave",
    category: "presence",
    scope,
    online,
  };
  const delayed = delayedLeaves.get(key);
  if (online && delayed) {
    clearTimeout(delayed.timer);
    delayedLeaves.delete(key);
    return;
  } else if (online) {
    const leavingIndex = pendingEvents.findIndex(
      (item) =>
        item.scope === scope &&
        personKey(item.person) === personKey(person) &&
        item.online === false,
    );
    if (leavingIndex >= 0) pendingEvents.splice(leavingIndex, 1);
  }
  if (!online) {
    if (pendingEvents.some(
      (item) =>
        item.scope === scope &&
        personKey(item.person) === personKey(person) &&
        item.online === true,
    )) {
      pendingEvents.splice(
        0,
        pendingEvents.length,
        ...pendingEvents.filter(
          (item) =>
            !(
              item.scope === scope &&
              personKey(item.person) === personKey(person) &&
              item.online === true
            ),
        ),
      );
      return;
    }
    const timer = setTimeout(() => {
      delayedLeaves.delete(key);
      enqueue(event);
    }, 500);
    delayedLeaves.set(key, { event, timer });
    return;
  }
  enqueue(event);
}

export function notifyMemberJoined(person: NotificationPerson, scope = "global") {
  const name = person.name || person.email;
  enqueue({
    person,
    title: `${name} joined the document`,
    detail: "They now have access to this document.",
    tone: "success",
    kind: "member.joined",
    category: "presence",
    scope,
  });
}

export function notifyAccessRequest(person: NotificationPerson, scope = "global") {
  enqueue({
    person,
    title: "Access requested",
    detail: `${person.name || person.email} asked to join this document.`,
    tone: "info",
    kind: "access.requested",
    category: "access",
    scope,
  });
}
