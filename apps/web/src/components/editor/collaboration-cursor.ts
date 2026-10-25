export type CollaborationCursorUser = {
  id?: string;
  name?: string;
  color?: string;
  avatar?: string | null;
};

const DEFAULT_COLOR = "#2563eb";
const CURSOR_IDLE_DELAY = 3000;
const cursorIdleTimers = new WeakMap<HTMLElement, number>();

function keepCursorVisibleWhileActive(cursor: HTMLElement) {
  cursor.classList.add("collaboration-cursor--active");

  const existingTimer = cursorIdleTimers.get(cursor);
  if (existingTimer !== undefined) window.clearTimeout(existingTimer);

  const timer = window.setTimeout(() => {
    cursor.classList.remove("collaboration-cursor--active");
    cursorIdleTimers.delete(cursor);
  }, CURSOR_IDLE_DELAY);
  cursorIdleTimers.set(cursor, timer);
}

export function showActiveCollaborationCursors(userId: string) {
  document
    .querySelectorAll<HTMLElement>(".collaboration-cursor[data-user-id]")
    .forEach((cursor) => {
      if (cursor.dataset.userId === userId) {
        keepCursorVisibleWhileActive(cursor);
      }
    });
}

function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function renderCollaborationCursor(
  user: CollaborationCursorUser,
): HTMLElement {
  const color = user.color || DEFAULT_COLOR;
  const name = user.name?.trim() || "Collaborator";

  const cursor = createEl(
    "span",
    "collaboration-carets__caret collaboration-cursor",
  );
  if (user.id) cursor.dataset.userId = user.id;
  cursor.style.setProperty("--collaboration-cursor-color", color);
  keepCursorVisibleWhileActive(cursor);

  const badge = createEl("span", "collaboration-cursor__badge not-prose");
  badge.setAttribute("aria-hidden", "true");

  const avatar = createEl("span", "collaboration-cursor__avatar");
  const fallback = createEl("span", "collaboration-cursor__fallback");
  fallback.textContent = (Array.from(name)[0] ?? "?").toUpperCase();
  avatar.append(fallback);

  if (user.avatar) {
    const image = createEl("img", "collaboration-cursor__image");
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    // Once the photo is in, drop the initial so transparent PNGs don't show it through.
    image.addEventListener("load", () => fallback.remove(), { once: true });
    image.addEventListener("error", () => image.remove(), { once: true });
    image.src = user.avatar;
    avatar.append(image);
  }

  const label = createEl("span", "collaboration-cursor__name");
  label.textContent = name;

  badge.append(avatar, label);
  cursor.append(badge);

  return cursor;
}
