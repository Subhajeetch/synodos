import { describe, expect, it } from "vitest";
import {
  dedupeNotifications,
  diffPresenceSnapshots,
  normalizePerson,
  shouldCoalesce,
} from "./index";

describe("notification core", () => {
  it("detects presence joins and leaves", () => {
    const prev = [{ id: "a" }, { id: "b" }];
    const next = [{ id: "b" }, { id: "c" }];

    expect(diffPresenceSnapshots(prev, next, "x")).toEqual({
      joined: ["c"],
      left: ["a"],
    });
  });

  it("deduplicates same notifications in a short window", () => {
    const events = [
      {
        type: "presence.join",
        person: normalizePerson({
          id: "u1",
          name: "Alice",
          email: "alice@example.com",
          image: null,
        }),
        priority: "normal",
        category: "presence",
        duration: 3500,
        sound: "join",
        dedupeKey: "presence.join:u1",
        scope: "presence",
        title: "Alice joined",
        detail: "Alice is now active.",
      },
      {
        type: "presence.join",
        person: normalizePerson({
          id: "u1",
          name: "Alice",
          email: "alice@example.com",
          image: null,
        }),
        priority: "normal",
        category: "presence",
        duration: 3500,
        sound: "join",
        dedupeKey: "presence.join:u1",
        scope: "presence",
        title: "Alice joined",
        detail: "Alice is now active.",
      },
    ] as const;

    expect(dedupeNotifications([...events], 5000)).toHaveLength(1);
  });

  it("coalesces same-type events from the same scope", () => {
    expect(
      shouldCoalesce(
        { type: "presence.join", scope: "presence" },
        { type: "presence.join", scope: "presence" },
      ),
    ).toBe(true);
    expect(
      shouldCoalesce(
        { type: "presence.join", scope: "presence" },
        { type: "presence.leave", scope: "presence" },
      ),
    ).toBe(false);
  });
});
