import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toast = {
  custom: vi.fn(),
  info: vi.fn(),
  dismiss: vi.fn(),
};

vi.mock("sonner", () => ({ toast }));
vi.mock("@/hooks/use-notification-preferences", () => ({
  getNotificationPreferences: () => ({
    soundEnabled: false,
    popupEnabled: true,
    alwaysShowCursor: false,
    soundVolume: 0.45,
    categories: { presence: true, access: true, system: true },
  }),
  playPresenceSound: vi.fn(),
}));

describe("notification dispatch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("cancels a brief leave when the same person returns", async () => {
    const notifications = await import("./notifications");
    const person = {
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      image: null,
    };
    notifications.notifyPresenceChange(person, false, "doc");
    await vi.advanceTimersByTimeAsync(400);
    notifications.notifyPresenceChange(person, true, "doc");
    await vi.advanceTimersByTimeAsync(1000);

    expect(toast.custom).not.toHaveBeenCalled();
  });

  it("coalesces joins and dismisses by document scope", async () => {
    const notifications = await import("./notifications");
    notifications.notifyPresenceChange(
      { id: "u1", name: "Alice", email: "a@example.com", image: null },
      true,
      "doc",
    );
    notifications.notifyPresenceChange(
      { id: "u2", name: "Bob", email: "b@example.com", image: null },
      true,
      "doc",
    );
    await vi.advanceTimersByTimeAsync(1200);

    expect(toast.custom).toHaveBeenCalledTimes(1);
    notifications.dismissNotificationScope("doc");
    expect(toast.dismiss).toHaveBeenCalledWith("doc:presence-join:batch");
  });

  it("shows a join notification with only a brief batching delay", async () => {
    const notifications = await import("./notifications");
    notifications.notifyPresenceChange(
      { id: "u1", name: "Alice", email: "a@example.com", image: null },
      true,
      "doc",
    );

    await vi.advanceTimersByTimeAsync(149);
    expect(toast.custom).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(toast.custom).toHaveBeenCalledTimes(1);
  });

  it("notifies about a leave promptly but ignores a short reconnect", async () => {
    const notifications = await import("./notifications");
    const person = {
      id: "u1",
      name: "Alice",
      email: "a@example.com",
      image: null,
    };
    notifications.notifyPresenceChange(person, false, "doc");

    await vi.advanceTimersByTimeAsync(499);
    expect(toast.custom).not.toHaveBeenCalled();
    notifications.notifyPresenceChange(person, true, "doc");
    await vi.advanceTimersByTimeAsync(650);
    expect(toast.custom).not.toHaveBeenCalled();

    notifications.notifyPresenceChange(person, false, "doc");
    await vi.advanceTimersByTimeAsync(650);
    expect(toast.custom).toHaveBeenCalledTimes(1);
  });
});
