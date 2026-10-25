import { useCallback, useSyncExternalStore } from "react";
import { playSound as playSoundEngine } from "@/lib/audio/sound-engine";

const STORAGE_KEY = "synodos:notification-preferences";
const CHANGE_EVENT = "synodos:notification-preferences-change";

export type NotificationCategoryPreferences = {
  presence: boolean;
  access: boolean;
  system: boolean;
};

export type NotificationPreferences = {
  soundEnabled: boolean;
  popupEnabled: boolean;
  alwaysShowCursor: boolean;
  soundVolume: number;
  categories: NotificationCategoryPreferences;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  popupEnabled: true,
  alwaysShowCursor: false,
  soundVolume: 0.45,
  categories: {
    presence: true,
    access: true,
    system: true,
  },
};

let cachedPreferences: NotificationPreferences | undefined;

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PREFERENCES.soundVolume;
  return Math.min(1, Math.max(0, value));
}

function normalizePreferences(raw: unknown): NotificationPreferences {
  const fallback = DEFAULT_PREFERENCES;
  if (!raw || typeof raw !== "object") return fallback;

  const value = raw as Partial<Record<string, unknown>>;
  const categories = {
    presence:
      typeof value.categories === "object" &&
      value.categories !== null &&
      typeof (value.categories as Record<string, unknown>).presence ===
        "boolean"
        ? Boolean((value.categories as Record<string, unknown>).presence)
        : fallback.categories.presence,
    access:
      typeof value.categories === "object" &&
      value.categories !== null &&
      typeof (value.categories as Record<string, unknown>).access === "boolean"
        ? Boolean((value.categories as Record<string, unknown>).access)
        : fallback.categories.access,
    system:
      typeof value.categories === "object" &&
      value.categories !== null &&
      typeof (value.categories as Record<string, unknown>).system === "boolean"
        ? Boolean((value.categories as Record<string, unknown>).system)
        : fallback.categories.system,
  };

  return {
    soundEnabled:
      typeof value.soundEnabled === "boolean"
        ? value.soundEnabled
        : fallback.soundEnabled,
    popupEnabled:
      typeof value.popupEnabled === "boolean"
        ? value.popupEnabled
        : fallback.popupEnabled,
    alwaysShowCursor:
      typeof value.alwaysShowCursor === "boolean"
        ? value.alwaysShowCursor
        : fallback.alwaysShowCursor,
    soundVolume: clampVolume(
      typeof value.soundVolume === "number"
        ? value.soundVolume
        : fallback.soundVolume,
    ),
    categories,
  };
}

function readPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored) as unknown;
    const migrated = normalizePreferences(parsed);

    if (stored !== JSON.stringify(migrated)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function getPreferencesSnapshot() {
  cachedPreferences ??= readPreferences();
  return cachedPreferences;
}

function writePreferences(preferences: NotificationPreferences) {
  cachedPreferences = normalizePreferences(preferences);
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(cachedPreferences);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (error) {
    console.error("Could not save notification preferences:", error);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function getNotificationPreferences() {
  return getPreferencesSnapshot();
}

export function useNotificationPreferences() {
  const subscribe = useCallback((listener: () => void) => {
    const onChange = () => listener();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      cachedPreferences = readPreferences();
      listener();
    };
    if (typeof window !== "undefined") {
      window.addEventListener(CHANGE_EVENT, onChange);
      window.addEventListener("storage", onStorage);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onStorage);
      }
    };
  }, []);

  const getSnapshot = useCallback(() => getPreferencesSnapshot(), []);
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setPreference = useCallback(
    (key: keyof NotificationPreferences, value: boolean | number) => {
      const updated = { ...getPreferencesSnapshot(), [key]: value };
      writePreferences(updated);
    },
    [],
  );

  return {
    preferences,
    setSoundEnabled: (value: boolean) => setPreference("soundEnabled", value),
    setPopupEnabled: (value: boolean) => setPreference("popupEnabled", value),
    setAlwaysShowCursor: (value: boolean) =>
      setPreference("alwaysShowCursor", value),
    setSoundVolume: (value: number) =>
      setPreference("soundVolume", clampVolume(value)),
    setCategoryPreference: (
      category: keyof NotificationCategoryPreferences,
      value: boolean,
    ) => {
      const current = getPreferencesSnapshot();
      const next = {
        ...current,
        categories: { ...current.categories, [category]: value },
      };
      writePreferences(next);
    },
  };
}

export function playPresenceSound(online: boolean) {
  const prefs = getNotificationPreferences();
  if (!prefs.soundEnabled || !prefs.categories.presence) return;
  void playSoundEngine(online ? "join" : "leave", prefs.soundVolume);
}
