import { beforeEach, describe, expect, it, vi } from "vitest";

describe("notification preferences store", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  it("returns a stable snapshot between preference updates", async () => {
    const { getNotificationPreferences } = await import(
      "./use-notification-preferences"
    );

    expect(getNotificationPreferences()).toBe(getNotificationPreferences());
  });

  it("migrates older preference values and fills missing defaults", async () => {
    window.localStorage.setItem(
      "synodos:notification-preferences",
      JSON.stringify({ popupEnabled: false, soundEnabled: false }),
    );
    const { getNotificationPreferences } = await import(
      "./use-notification-preferences"
    );
    const preferences = getNotificationPreferences();

    expect(preferences.popupEnabled).toBe(false);
    expect(preferences.soundEnabled).toBe(false);
    expect(preferences.soundVolume).toBe(0.45);
    expect(preferences.categories).toEqual({
      presence: true,
      access: true,
      system: true,
    });
    expect(window.localStorage.getItem("synodos:notification-preferences")).toBe(
      JSON.stringify(preferences),
    );
  });
});
