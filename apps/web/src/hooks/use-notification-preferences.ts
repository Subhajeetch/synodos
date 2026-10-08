import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "synodos:notification-preferences";
const CHANGE_EVENT = "synodos:notification-preferences-change";

export type NotificationPreferences = {
  soundEnabled: boolean;
  popupEnabled: boolean;
  alwaysShowCursor: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  popupEnabled: true,
  alwaysShowCursor: false,
};

function readPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;

    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== "object") return DEFAULT_PREFERENCES;

    const preferences = value as Partial<NotificationPreferences>;
    return {
      soundEnabled:
        typeof preferences.soundEnabled === "boolean"
          ? preferences.soundEnabled
          : DEFAULT_PREFERENCES.soundEnabled,
      popupEnabled:
        typeof preferences.popupEnabled === "boolean"
          ? preferences.popupEnabled
          : DEFAULT_PREFERENCES.popupEnabled,
      alwaysShowCursor:
        typeof preferences.alwaysShowCursor === "boolean"
          ? preferences.alwaysShowCursor
          : DEFAULT_PREFERENCES.alwaysShowCursor,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(preferences: NotificationPreferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (error) {
    console.error("Could not save notification preferences:", error);
  }
}

export function getNotificationPreferences() {
  return readPreferences();
}

export function playPresenceSound(online: boolean) {
  if (!readPreferences().soundEnabled || typeof window === "undefined") return;

  const soundUrl = online
    ? new URL("../assets/join.wav", import.meta.url).href
    : new URL("../assets/leave.wav", import.meta.url).href;
  const audio = new Audio(soundUrl);
  audio.volume = 0.45;
  void audio.play().catch((error: unknown) => {
    console.warn("Could not play the collaborator presence sound:", error);
  });
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const syncPreferences = () => setPreferences(readPreferences());
    syncPreferences();
    window.addEventListener(CHANGE_EVENT, syncPreferences);
    window.addEventListener("storage", syncPreferences);

    return () => {
      window.removeEventListener(CHANGE_EVENT, syncPreferences);
      window.removeEventListener("storage", syncPreferences);
    };
  }, []);

  const setPreference = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      const updated = { ...readPreferences(), [key]: value };
      setPreferences(updated);
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
  };
}
