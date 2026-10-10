# ROLE

You are a principal frontend engineer working in a production codebase ("Synodos", a real-time collaborative document editor). Stack: React + Vite + react-router, TanStack Query, Tiptap v3 (ProseMirror) + Yjs + Hocuspocus, Tailwind, shadcn/ui on Base UI (note the `render` / `nativeButton` props), sonner toasts, a shared package `@synodos/shared`. Work like a senior engineer at a large company: correct first, measured, tested, reviewable, no cleverness without payoff.

# MISSION

Deliver five things, in this order of phases:

1. A Canva/Figma-style zoom + pan canvas around a fixed A4 page.
2. Professional document typography/print CSS.
3. A much richer Tiptap editing experience.
4. A production-grade sound engine (preloaded, decoded once, instant playback).
5. A "smart" notification center (no overlap, no spam, coalescing, priorities), plus a hardening pass over bugs listed in Phase 6.

# WORKING AGREEMENT

- Phase 0 is read-only. Report findings (max ~20 lines) before you edit anything.
- Create branch `feat/editor-canvas-notifications`. One commit per phase, conventional-commit messages. After every phase run typecheck, lint, tests and build, and fix everything before moving on. Never leave the tree red.
- TypeScript strict. No `any`, no non-null `!` without a comment, no new `eslint-disable` (an existing one in `PersistentCollaborationConnection` stays). Follow the existing code style, file layout, `@/` aliases, and shadcn/Base UI patterns. Reuse existing UI primitives.
- Every async call, listener, timer, observer, and rAF must be cleaned up. Every external API (`localStorage`, `AudioContext`, `clipboard`, `ResizeObserver`, `BroadcastChannel`) must be feature-detected and wrapped so failure degrades gracefully and never throws into React.
- Do not change the Yjs document structure, the Hocuspocus protocol, or `@synodos/shared` message schemas unless unavoidable. If unavoidable, stop and ask.
- DECISION GATES — stop and ask the user (do not guess) before: (a) changing the editor schema so the document root only accepts pages, or any data migration; (b) implementing image upload (needs a backend endpoint); (c) implementing automatic content pagination; (d) adding any dependency not listed here.
- Tiptap/ProseMirror/Yjs hygiene: all `@tiptap/*` packages must resolve to the SAME version as the installed `@tiptap/react`. Install new Tiptap packages pinned to that exact version. After installing, run `npm ls yjs prosemirror-state prosemirror-view prosemirror-model` and make sure there is exactly one copy of each (duplicates cause "Yjs was already imported" and broken plugin keys). Verify every Tiptap v3 import path against the installed package's type definitions or official docs; never guess export names.
- Schema additions (tables, images, text-style marks) are additive. Note in the final report that stale open tabs without the new extensions may not render the new nodes until reloaded.

# PHASE 0 — DISCOVERY (read-only)

Read at minimum: package.json and lockfile, tsconfig, eslint config, the test setup (if any), the editor page, `EditorWorkspace`, `EditorToolbar`, `EditorSidebar`, `page.ts`, `page-node-view.tsx`, `page-actions.ts`, `page-controls.tsx`, `editor-document.css`, the collaboration-cursor CSS/TS, `use-documents.ts`, `use-notification-preferences.ts`, `use-presence.ts`, `use-offline-persistence.ts`, `@/lib/api`, `@/lib/collab`, `@/components/ui/person-toast`, wherever `<Toaster>` is mounted and configured, the server package that hosts Hocuspocus (if it is in this repo), and the sound assets in `src/assets`.
Report: exact versions of tiptap / yjs / prosemirror-view / react / tailwind; duplicate-package check; whether `@tailwindcss/typography` is installed (the editor relies on the `prose` class); whether StarterKit v3 includes a TrailingNode extension that may be appending a paragraph at the document ROOT outside any page (verify in a real doc); the `<Toaster>` props; whether the server restricts `GET /documents/:id/members` to owners (the client hook is enabled for all roles and the sidebar shows the count to everyone — a mismatch is a bug); the size/format of the .wav files; whether a test runner exists; where CSS variables `--heading`, `--text-h`, `--mono`, `--code-bg` are defined.

# PHASE 1 — CANVAS: ZOOM + PAN (Canva-style) AROUND A FIXED A4 PAGE

## Problems to eliminate

- The paper is `min(100%, 210mm)` with `cqi` units, so opening the sidebar or resizing the window reflows text. The page must be a fixed A4 size in layout (210mm × 297mm ≙ 794 × 1123 CSS px). Zoom is a visual transform only; it must NEVER cause reflow or change line breaks.
- Zoom currently uses the CSS `zoom` property, mixed with a React `style` prop, driven by React state per wheel tick, and its listeners are attached in an effect with `[]` deps that reads a ref once (breaks if `<main>` mounts later because `editor` is initially null).

## Required architecture

DOM (names are suggestions):
.editor-canvas scroll viewport: overflow auto, `overflow-anchor: none`, `overscroll-behavior: contain`, `touch-action: pan-x pan-y`, holds CSS var `--zoom`
└ .editor-canvas__stage padding that provides free-pan room
└ .editor-canvas__sizer width/height = paper size × zoom, so native scrollbars are exact
└ .editor-paper-frame fixed `width: 794px`, `transform: scale(var(--zoom))`, `transform-origin: 0 0`

- Use `transform: scale()`, never CSS `zoom`. Do NOT add `will-change: transform` (it blurs text when zoomed in).
- Zoom state lives outside React render: `--zoom` is written directly on the scroller element; the numeric value lives in a ref exposed through `useSyncExternalStore` so ONLY the zoom controls re-render while zooming. `EditorWorkspace`, the toolbar and the editor must not re-render per zoom frame (verify with React Profiler and report).
- Use callback refs backed by state (not `useRef` + `[]` deps) so listeners attach when the elements actually mount.
- Keep `--paper-h` in sync with the real unscaled content height via `ResizeObserver` (pages grow), with `borderBoxSize` and an `offsetHeight` fallback.

## Cursor-anchored zoom (the core behavior)

For any zoom change with an anchor point A (client coords): compute the unscaled document point under A before the change (`(A - paperRect.topLeft) / zoomPrev`), apply the new `--zoom`, force layout by re-reading the rect, then adjust `scrollLeft/scrollTop` so that same document point is again under A. If an anchor is not supplied use the viewport center. Zoom range 25%–300%; clamp everywhere.

## Input handling (all must work)

- Ctrl/Cmd + wheel and trackpad pinch (Chrome/Edge/Firefox emit wheel with ctrlKey): preventDefault, zoom toward the cursor. Pinch (many small fractional deltas) applies instantly using `exp(-delta * k)`. Discrete mouse-wheel notches (large deltas, or `deltaMode === DOM_DELTA_LINE`) must be smoothed: accumulate a target zoom and ease toward it with rAF (log-space interpolation, ~140–180ms, cancelable by new input), anchor fixed at the cursor.
- Safari trackpad pinch: `gesturestart` / `gesturechange` (preventDefault, scale relative to base zoom, anchor at event clientX/Y).
- Touch: two-finger pinch with the midpoint as anchor; one finger pans natively.
- Plain wheel and two-finger trackpad scroll pan natively; Shift+wheel pans horizontally.
- Middle-mouse drag and a Hand tool (toggle button + hold Space while not typing) pan with pointer capture, `grab`/`grabbing` cursors; while the hand tool is active the ProseMirror content must not receive pointer events.
- Keyboard: Ctrl/Cmd + `+` / `-` / `0` (smooth step ×1.25, reset to 100% centered). Ignore when the event comes from an input/textarea/contenteditable inside dialogs, but DO handle it from the editor.
- `prefers-reduced-motion`: no easing, apply instantly.

## Free panning without ugly scrollbars

Padding around the page must NOT cause a horizontal scrollbar at fit/100% on normal screens. Rules: when the scaled paper fits horizontally, center it and show no horizontal scrollbar; when it is wider than the viewport, add pan slack so the user can drag either page edge to roughly the viewport center (Figma/Canva feel); generous bottom padding so the last page can scroll to the top; modest top padding. Implement slack through CSS variables updated in the same synchronous step as the zoom change so anchor math stays correct (re-read the rect after changing them). Where scroll limits clamp the anchor, that is acceptable; document it.

## Layout-change handling

- Observe the scroller size. If the user is in "Fit width" or "Fit page" mode, re-fit on resize and on sidebar open/close (animate with the same easing). If in a manual zoom, keep the document point at the viewport center stable when the viewport resizes (sidebar toggle must not make the page jump).
- On first mount: fit-to-width if the viewport is narrower than the page (mobile), else 100% centered.
- Persist zoom mode/value per document in localStorage (key `synodos:zoom:<docId>`), fully try/catch-wrapped, validated on read.

## Footer zoom UI (replace the old slider/readout)

Zoom out / in buttons (disabled at limits), a slider mapped on a LOG scale (so it feels linear), a clickable percentage readout opening a presets menu (Fit width, Fit page, 50, 75, 100, 125, 150, 200, 300), a Fit-width button, a Hand-tool toggle, keyboard-accessible with `aria-valuetext="125 percent"`. Keep the Pages / thumbnails control and page indicator. Only the zoom controls subscribe to zoom.

## Tiptap/ProseMirror interplay

- Set `editorProps.scrollThreshold` and `scrollMargin` (~80) so the caret never sticks to the viewport edge. Confirm caret-into-view and click-to-position work at 25%, 100%, 300% (prosemirror-view must be a version that handles CSS-scaled containers; upgrade within semver if not, and report).
- Floating UI (BubbleMenu, link popover, table menu, tooltips, dialogs) must render OUTSIDE the scaled subtree (portal to `document.body` / `appendTo`) so it does not scale with the page. Remote collaborator cursor labels live inside the page: counter-scale the badge (CSS `transform: scale(clamp(0.8, calc(1 / var(--zoom)), 1.6))`, `transform-origin: left bottom`, composed with the existing show/hide transform via a CSS variable) so names stay readable when zoomed out. The page-controls bar scales with the page (intentional).
- Add a visible dashed A4 height guide at 297mm per page plus a subtle "Content extends past A4" indicator when a page's content exceeds 297mm (cheap, non-intrusive). Automatic content pagination is a DECISION GATE — do not build it; propose a design in the report.

## Acceptance criteria

Paper `offsetWidth` is always 794 and text never reflows when opening/closing the sidebar or zooming. A word under the cursor stays under the cursor (±1px) during Ctrl+wheel/pinch away from scroll limits. 25%→300% pan to all four page corners works. Zoom interaction holds ~60fps with a long document and zero React re-renders of the workspace per frame. Works with mouse, trackpad, touch, and keyboard, in Chrome, Firefox, Safari. Read-only (viewer) users can still zoom, pan, select, and copy.

# PHASE 2 — DOCUMENT TYPOGRAPHY & PRINT CSS

- Remove the `font-size: inherit` / `line-height: inherit` / `letter-spacing: inherit` overrides on h1/h2 (they make headings identical to body text). Define a document-scoped typography system independent of app UI: CSS variables for font family, body 11pt-equivalent size, line height, heading scale H1–H4, paragraph spacing, list indents, blockquote, hr, links, inline code (use `display: inline`, NOT `inline-flex`, which breaks wrapping), code blocks, task lists, tables (borders, `.selectedCell`, resize handle, header cells), images (`max-width: 100%`, selection outline). Verify the undefined variables found in Phase 0 resolve, or define safe fallbacks.
- The paper is always a white page, so document text colors must not depend on the app dark theme; keep the existing dark-mode page-controls overrides working.
- `@media print`: `@page { size: A4; margin: 0 }`, hide all chrome (header, toolbar, sidebar, footer, page controls, collaboration cursors), remove the zoom transform and canvas padding, one `.editor-page-surface` per sheet with `break-after: page` and exact A4 dimensions.
- Confirm the Placeholder still renders with the Page wrapper node.

# PHASE 3 — EDITING FEATURES (Tiptap v3)

Install pinned to the installed Tiptap version: extension-text-style (TextStyle, Color, FontFamily, FontSize, LineHeight if exported), extension-highlight, extension-text-align, extension-subscript, extension-superscript, extension-list (TaskList, TaskItem), extension-table (Table, TableRow, TableHeader, TableCell), extension-typography, extension-image (no base64), and CharacterCount from `@tiptap/extensions`. StarterKit v3 already includes underline and link: configure link (`openOnClick: false`, `autolink`, `defaultProtocol: "https"`, validate/sanitize hrefs, block `javascript:`), and expose underline. Keep `undoRedo: false` (Yjs owns undo). If a TrailingNode extension is active, make sure it cannot append content outside pages (disable or configure it).

P0 (must ship):

- Toolbar redesign: grouped, keyboard-accessible per the ARIA toolbar pattern (roving tabindex, arrow keys), tooltips showing shortcuts (⌘B etc.), `onMouseDown preventDefault` so selection is kept, focus returns to the editor after any action, responsive overflow ("More" menu) driven by ResizeObserver instead of wrapping to many rows, everything disabled in read-only mode.
- Text style select (Paragraph, Heading 1–4), font family select (a SAFE system/web-safe stack only — do not add external font requests), font size stepper/select, text color and highlight color pickers with accessible swatch palettes and "reset", bold/italic/underline/strike/inline code/sub/superscript, text alignment (left/center/right/justify), bullet/numbered/task lists with indent/outdent, blockquote, code block, horizontal rule, clear formatting, link popover (not `window.prompt`; edit/remove/open; selection-aware; `extendMarkRange`), insert table with contextual table controls shown only while the selection is in a table (add/delete row & column, merge/split cells, toggle header row, cell background, delete table).
- Word and character count in the footer via CharacterCount, updated cheaply (it must not re-render per keystroke more than necessary — use `useEditorState` with a custom equality function).
- Use `useEditorState` selectors that return primitives or use equality functions so the toolbar only re-renders when its own values change.
  P1 (ship if Phase 1–2 are green): floating selection BubbleMenu (bold/italic/link/color; portaled outside the scaled subtree), slash-command menu (`@tiptap/suggestion`) for blocks, drag handle for blocks, keyboard-shortcut help dialog (Ctrl+/).
  P2 / DECISION GATES: image upload (ask for the backend endpoint; never store base64 in the Yjs doc), auto-pagination, find & replace, comments, version history, export. Propose, do not build.

# PHASE 4 — SOUND ENGINE (preload, decode once, play instantly)

Replace the current `playPresenceSound` (which does `new Audio(url)` on every call: re-fetch, re-decode, latency, and blocked by autoplay policy) with a dedicated module, e.g. `src/lib/audio/sound-engine.ts`, a framework-agnostic singleton:

- Import assets with Vite `?url` (or equivalent) rather than `new URL(..., import.meta.url)`.
- Create ONE `AudioContext` lazily (with `webkitAudioContext` fallback, `latencyHint: "interactive"`), a master `GainNode`, and per-play gain with a ~10ms fade-out to avoid clicks.
- Preload: `fetch` each registered sound once → `decodeAudioData` → cache the `AudioBuffer`. De-duplicate in-flight loads, retry with exponential backoff on failure, and start preloading at app/editor mount during idle time (`requestIdleCallback` with a timeout fallback). Decoding works on a suspended context, so preload does not need a user gesture.
- Autoplay unlock: on the first `pointerdown` / `keydown` / `touchend`, call `ctx.resume()` and play a 1-sample silent buffer (required on iOS Safari), then remove the listeners. Re-resume on `visibilitychange` and handle Safari's `"interrupted"` state. If the context is not running when a sound is requested, drop it silently (never queue a burst that plays later); log only in dev.
- Playback policy: per-sound minimum interval (~700ms), global cap on concurrent voices (2), disconnect nodes on `ended`. Distinct join and leave sounds. Volume from user preference (default 0.45 as today).
- Fallback: if Web Audio is unavailable, use a small pool of preloaded `HTMLAudioElement`s (`preload="auto"`, reset `currentTime`), still rate-limited. Every `play()` rejection is caught.
- HMR cleanup via `import.meta.hot`, no work at import time besides registration, safe when `window` is undefined.
- If a .wav is large, report its size and suggest a compressed encoding (do not convert without telling the user).
- Unit-test with a mocked AudioContext (rate limit, dedupe, not-running drop, fallback path).

# PHASE 5 — SMART NOTIFICATION CENTER

Today `notifyPerson` calls `toast.custom` directly with no ids, no dedupe and no queueing, and presence detection lives inside `EditorWorkspace`. Replace with a layered system:

## Structure

- `src/lib/notifications/` (framework-agnostic core) + thin React hooks. Move the `notify*` helpers out of `use-documents.ts` (they are not query hooks); keep temporary re-exports if needed, then update all imports and delete the shims.
- Typed discriminated-union events: presence.join, presence.leave, access.requested, access.request_declined, invitation.sent, invitation.revoked, member.joined, member.removed, member.role_changed, access.lost, system. Each kind has a policy: priority (critical / high / normal / low), category (presence / access / system), duration, sound (none / join / leave), dedupe window, coalesce window, per-person cooldown, sticky or not.
- Move all detection out of `EditorWorkspace` into pure, unit-testable diff functions plus small hooks: `usePresenceNotifications`, `useSharingNotifications`, `useRoleAndAccessNotifications`. The diff functions take previous/next snapshots and return events.

## Pipeline (in order)

1. Preference gate (popup and sound are independent flags; add per-category toggles, backwards compatible with the stored `synodos:notification-preferences` JSON, migrated on read).
2. Self-suppression (never notify about yourself; multiple tabs of the same person count as ONE person; an owner's own mutation must not produce a second event toast for the same fact).
3. Reconnect-storm protection: suppress presence events while the local provider is not connected+synced, and silently re-baseline ~1s after reconnect, so a flaky network never causes everyone to "leave and join".
4. Flap suppression: delay "left" by a grace period (~4s) and cancel it if the person returns; a join followed by a leave inside the window cancels out.
5. Dedupe by stable key within a window.
6. Coalescing: collect same-kind events in a trailing window (~1200ms, max wait ~3000ms) and render one summary ("Alice and 2 others joined"), with avatars of the first few people.
7. Visibility handling: while the tab is hidden, buffer; when it becomes visible, show ONE digest instead of N toasts, and play at most one sound.
8. Queue and anti-overlap: limit concurrently visible toasts (3); order by priority; critical/high pre-empt low; overflow collapses into a single "+N more" toast updated in place. Use deterministic sonner ids (`<scope>:<kind>:<personId|batch>`) so repeated events UPDATE an existing toast instead of stacking. Scope ids by docId; dismiss that scope's toasts on unmount/navigation so nothing leaks into other pages.
9. Sound: at most one sound per flushed notification group, never more than one per ~700ms globally, tied to the FINAL decision to show (suppressed notifications make no sound), via the Phase 4 engine.
10. Render: presence toasts short (~3.5s), low priority; access requests/removals/role changes longer (~8s) or sticky with a close button and `role="alert"`; presence uses `role="status"`/polite. Pause on hover (sonner default), swipe/close supported, respect `prefers-reduced-motion`.

- Configure `<Toaster>` so toasts never cover the editor footer controls, toolbar or sidebar (choose position/offset after reading the layout; justify in the report).
- Optional (P2, behind a flag, off by default): cross-tab coordination with `BroadcastChannel` so only the most-recently-active tab plays sounds.

## Preferences store

Rewrite `use-notification-preferences` on `useSyncExternalStore` with an in-memory cached snapshot (updated on write and on the `storage` event) so: no flash of default values on first render (today `alwaysShowCursor` starts false then flips), no localStorage parsing on every `getNotificationPreferences()` call, stable snapshot references, validation of every field, tolerant of corrupt JSON and blocked storage. Add `soundVolume` (0–1).

## Tests (fake timers)

Coalescing, flap/grace cancel, dedupe, priority pre-emption, overflow digest, hidden-tab digest, reconnect re-baseline, self-suppression, multi-tab-as-one-person, sound rate limit, preference gating, preference migration.

# PHASE 6 — BUGS & HARDENING (fix each; list in the report)

1. Re-render storm: `useHocuspocusAwareness` emits on every remote cursor move, so `usePresence` returns a new array and `EditorWorkspace`, toolbar and footer re-render constantly. Return a referentially stable result (structural comparison of id/name/avatar/color/isTyping/connections). Measure before/after with React Profiler.
2. `PageNodeView` subscribes to the entire doc on every transaction. Select only `pageIndex` and `pageCount` with an equality function; guard `getPos()` returning undefined. `EditorPagesFooter` computes page summaries on every transaction even when thumbnails are closed: compute only when open, and select only current page index and page count otherwise.
3. Stale identity: the collaboration `user` is read once at editor creation, so a late-loading session leaves the caret label "Anonymous". Call `editor.commands.updateUser(user)` in an effect keyed on id/name/avatar/color.
4. Access-lost handling is triplicated (EditorPage effect, the stateless handler, and the `lostAccess` effect), each calling `navigate`. Consolidate into one idempotent `handleAccessLost` with a guard ref.
5. Verify the `/members` permission mismatch from Phase 0 and fix it (client gating or a report to the user if the fix is server-side).
6. Verify/disable any TrailingNode that appends a paragraph outside pages. DECISION GATE: if the editor schema should become `page+` at the root (prevents nested pages and loose root content), do NOT apply it until a migration for existing documents is confirmed (existing docs with loose root content could be corrupted on load); present options.
7. `migratePages` race: two clients opening a legacy doc at once can both migrate and duplicate content. DECISION GATE: propose either a server-side one-time migration (Hocuspocus `onLoadDocument` with `@hocuspocus/transformer`, needs the Tiptap schema shared with the server) or a CRDT claim protocol (write a claim in the Yjs map, wait for sync, migrate only if your clientID won). Report before implementing.
8. Shadowed `userId` in the presence loop; `handleCopyLink` timer not cleared on unmount and no fallback when the Clipboard API is unavailable (insecure context): handle both.
9. Add an error boundary around the editor workspace with a recoverable fallback ("Something went wrong rendering the editor. Your changes are safe in the collaboration server / local copy." + retry) so a render error never blanks the screen; report to console in a single place.
10. Page actions (`movePage`, `deletePage`, …): wrap `dispatch` in try/catch, return false on failure, and surface a toast on real failures.
11. Verify in dev StrictMode that `PersistentCollaborationConnection` does not leak or duplicate websockets (check the Network → WS tab); report only unless a leak is confirmed.
12. REPORT ONLY (do not change): `useDocument` polls every 5s forever; consider relying on stateless messages plus focus refetch.

# HARD DON'TS

No CSS `zoom`, no `will-change: transform` on the paper, no per-frame React `setState`, no `window.prompt/alert/confirm`, no base64 images in the Yjs doc, no `new Audio()` per play, no toasts fired from render, no unbounded timers/listeners, no swallowed errors without at least a dev log, no unrelated refactors or drive-by reformatting, no secrets or env changes.

# TESTING & QA

Add unit tests (Vitest if no runner exists; adding it is the one pre-approved dev dependency) for: zoom math (clamp, anchor invariants, log-slider mapping), notification pipeline and diffs, preference store, sound engine. Then do and report a manual QA pass: sidebar toggle causes no reflow; Ctrl+wheel/pinch anchors at cursor; 25% and 300% pan to all corners; caret scroll while typing at 300%; two browsers with carets/labels at several zooms; viewer role; offline → online (no notification storm); remove/role-change a collaborator; invite/approve/decline flows; hidden-tab digest; sound after first click, no sound before; keyboard-only toolbar use; print preview is exact A4.

# FINAL REPORT (required format)

1. Phase 0 findings. 2. Per phase: what changed, files touched, new dependencies (name, version, why). 3. Bugs fixed (map to the Phase 6 numbers) and bugs found but NOT fixed. 4. Decision gates hit and the options you recommend. 5. Test results and measured performance (re-render counts before/after). 6. Known limitations and suggested follow-ups.
