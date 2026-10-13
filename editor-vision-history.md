ROLE
You are a senior staff product engineer and architect working directly in this repository (Synodos, a collaborative document editor). You can read, edit, create and run files here. Your job is to design AND fully implement a production-grade document version-history system, end to end, in a single uninterrupted run. Work professionally: verify before assuming, follow the repo's existing conventions, and never claim something works unless you have run it.

SOURCE OF TRUTH
Read `editor-vision-history.md` completely before doing anything else. Then verify every claim in it against the actual code. Where the document and the code disagree, trust the code and note the discrepancy in your final report. Do not treat landing-page copy, the delete-confirmation text, or the "Coming Soon" sidebar card as evidence that history works. `document_versions` exists in the schema and migration 0000, but the application does not use it today. Confirm this yourself.

WORKING MODE

- Plan and implement in one go. Do not pause for approval. Stop only for a hard blocker (missing credentials, broken toolchain, contradictory requirements), and say exactly what blocked you.
- Phase 0 is investigation: read the files listed in `editor-vision-history.md` plus anything else you find relevant (package.json scripts, lint/test/typecheck config, existing tests, UI component library, styling conventions). Write a concise plan with the same design sections as below, then implement it in dependency order.
- Work on a new git branch, make small, logical, well-named commits, never force-push, never commit secrets, and never edit an already-applied migration. Add a new Drizzle migration generated with the repo's own tooling.
- Reuse existing patterns (Fastify/route style, `requireUser`, Zod schemas in `packages/shared`, TanStack Query hooks, Redis event patterns, UI primitives, CSS conventions). Do not introduce an unrelated architecture or new dependencies without a clear reason, and justify any new dependency.
- After each phase run typecheck, lint, tests and build. Fix everything you break. At the end the whole repo must be green.

DECISIONS ALREADY MADE (do not ask, implement these, and explain them in the docs and final report)
Permissions:

- Every role with document access (owner, editor, viewer) can open version history, list versions, preview any version, and see author/timestamp metadata.
- ONLY the owner can restore a version.
- Editors and owners can create named checkpoints and rename labels. Viewers cannot. Enforce on the server, not only in the UI.
- Non-members get 404 on every version endpoint, exactly like existing document reads. A version ID must always be validated as belonging to the document ID in the route.
- Author identity is derived from the authenticated session or collaboration connection context on the server. Never trust client-supplied user IDs or roles.

Sensible defaults, which you may refine if the code gives you a good reason. Document every refinement:

- Representation: store full Yjs snapshots (`Y.encodeStateAsUpdate` of the merged server doc) in `document_versions.state`. Compare this with incremental updates and diff-based storage in your design doc and explain why full snapshots win for this app (simple, self-contained, safe to preview and restore, no replay chain to corrupt). Keep the compression and size trade-offs in mind.
- Additive schema migration on `document_versions`: add a `kind` enum (`auto`, `named`, `restore`, `pre_restore`), `content_hash` for deduplication, `size_bytes`, nullable `restored_from_version_id`, and a contributors field if justified. Keep the existing `(document_id, created_at)` index and add whatever listing and dedupe indexes you need. Backfill nothing destructive.
- Automatic checkpoints are created by the collaboration server (`apps/collab/src/index.ts`) inside or alongside the existing store flow, from the in-memory merged document, not by re-reading Postgres. Create one when content has actually changed (hash differs from the latest version) AND at least 10 minutes have passed since the last auto checkpoint, and also when the last connection to a document closes if unsaved changes exist. Never create empty duplicates. Make the interval and limits configurable constants or env values.
- Author attribution for auto checkpoints: track which authenticated users made changes since the previous snapshot and attribute the version to them (primary author plus contributors). If no user is known, attribute to the system and say so in the UI.
- Retention: never delete `named`, `restore` or `pre_restore` versions. Thin `auto` versions on a tiered schedule (keep all for 24h, one per hour for 7 days, one per day for 30 days, then drop), pruned lazily and safely and covered by tests. Cap the maximum snapshot size and handle the failure case gracefully.
- Restore semantics: restore is a NEW forward event, never time travel and never a database overwrite under live clients. Procedure: (1) create a `pre_restore` snapshot of the current live state so the restore is itself undoable, (2) apply the target snapshot to the LIVE document inside the collaboration server as a single Yjs transaction (load the snapshot into a separate temporary Y.Doc, then in the live doc replace the document content, `pageMetadata` and any other structures such as `editorMigrations` with clones from the snapshot), (3) create a `restore` version recording `restored_from_version_id` and the acting owner, (4) let Hocuspocus and Redis propagate the change so every connected collaborator converges normally. Design how the API service reaches the collaboration service (use the existing Redis/event pattern or an authenticated internal endpoint, whichever fits the repo), make the operation idempotent, handle collab-unavailable and retry cases, and describe what happens to offline clients that reconnect with older edits (CRDT merge behaviour) honestly in the docs and UI copy.
- Preview semantics: previewing never touches the live Y.Doc, the Hocuspocus provider, the offline IndexedDB store, or the shared document. Decode the snapshot into a standalone, isolated Y.Doc with no provider and no persistence, and render it in a read-only editor that uses the exact same Tiptap extension set and schema as the live editor.

REQUIRED DELIVERABLES

1. Design doc: write `docs/version-history.md` (or the repo's docs location) covering: current vs scaffolded vs to-build, architecture and file map, data model and retention, API and Zod design, snapshot and restore semantics (including concurrency, ordering, retries, failure modes), frontend integration, security and privacy, test and release plan, and a short "decisions and rationale" section. Separate confirmed facts from recommendations.
2. Database: new migration and updated Drizzle schema, queries in `packages/db/src/queries.ts` (list with cursor pagination, get, create, label, find-latest, prune, count), all scoped by document ID.
3. Shared package: Zod schemas and TypeScript types for every request and response, exported from `packages/shared` and following the existing style. Add a `canRestoreVersions` / `canCreateVersions` style helper to `packages/shared/src/roles.ts` rather than scattering role checks.
4. API (`apps/api/src/routes`): list (cursor pagination, newest first, metadata only, never the binary state), get one version (metadata + state delivered efficiently, for example a separate binary or base64 endpoint with sensible size handling), create named checkpoint, update label, restore. Every endpoint uses `requireUser`, checks the document role server-side, validates params and bodies with Zod, returns correct status codes and consistent error shapes, rate-limits or guards expensive operations where the repo has a pattern, and writes author identity from the session.
5. Collaboration server (`apps/collab`): automatic checkpoints, contributor tracking, restore application inside the live doc, pre-restore and restore version records, and notification to connected clients (for example a "document was restored by X" event) via the existing Redis event channel. Handle access revocation: if a user loses access, their history access ends too.
6. Frontend:
   - Hooks in `apps/web/src/hooks` (for example `use-document-versions`) built with TanStack Query: infinite list, version fetch/decode, create checkpoint, rename, restore, with proper cache invalidation. Coordinate with the existing 5-second document polling so it does not fight history state.
   - History state lives in a dedicated hook or context, not scattered across components. Include a URL-addressable selected version (for example `?version=<id>`) so previews can be deep-linked and survive reload, with a clean fallback if the version no longer exists.
   - Replace the "Coming Soon" card in `editor-sidebar.tsx` with a working history list: newest first, grouped by day, showing author avatar and name, timestamp (relative with absolute on hover), label, kind badges (auto, named, restore), loading skeletons, an empty state, an error state with retry, and "load more" pagination. Include a "Name this version" action for editors and owners.
   - Preview mode in the editor canvas: when a version is selected, the canvas shows that historical content in a read-only editor built from an isolated Y.Doc. Page nodes, page titles (`pageMetadata`), tables, images, lists, tasks, highlights, alignment and links must all render faithfully. Extract the shared extension configuration from `editor-workspace.tsx` so live and preview editors cannot drift apart. The live editor, provider and collaboration presence remain intact underneath, and the toolbar and editing shortcuts are disabled or hidden in preview.
   - Floating information panel (this is a key UI piece): a polished floating box anchored over the editor surface showing the selected entry's title or label, kind, author, exact timestamp, relative time, position in history ("3 of 42"), and clear actions: Previous (older), Next (newer), Back to current document, and Restore this version (visible to the owner only; for others, show a clear explanation that only the owner can restore). A persistent, unmistakable "You are viewing a past version, not the live document" indicator must be visible while previewing (banner or tinted chrome), using more than color alone.
   - Restore flow: owner-only confirmation dialog that states exactly what will happen ("This replaces the current content for everyone with the version from <date/time> by <author>. Your current version will be saved first so you can undo this."), mentions active collaborators by count where presence data exists, requires explicit confirmation, shows progress, success and failure feedback, handles "collaboration service unavailable" and "someone changed things meanwhile" cases, and returns the user to the live document afterward.
   - Live-session safety: if the document is restored by someone else while the user is previewing, notify them calmly without yanking them out of context; if access is revoked, leave history safely.
   - Accessibility: full keyboard operation (open/close history, arrow or shortcut navigation between entries, Esc to leave preview), correct roles and labels, focus moved into and restored out of the panel and dialog, a focus trap in the confirmation dialog, `aria-live` announcements for loading, selection changes, restore results and errors, sufficient contrast, visible focus rings, reduced-motion support, and nothing conveyed by color alone.
   - Responsive: the floating panel adapts on narrow screens (for example a bottom sheet), the list works in the sidebar on desktop and as a drawer on small screens, and the canvas and zoom/page footer remain usable.
   - Visual quality: match the existing design language exactly (tokens, spacing, typography, dark mode if the app has it). It must look like it was always part of the product, with polished states, subtle transitions and no layout shift.
7. Copy and consistency: review landing-page and delete-confirmation text that mentions history or restoration. Make it accurate with respect to what now exists, and do not overpromise.
8. Tests (use the repo's existing test tooling):
   - Authorization: every endpoint across owner, editor, viewer, non-member and cross-document version IDs.
   - Snapshot creation: dedupe, interval, last-disconnect trigger, no-op on unchanged content, author and contributor attribution.
   - Preview isolation: previewing mutates nothing in the live Y.Doc, provider or IndexedDB.
   - Restore: pre_restore plus restore records, correct content and `pageMetadata` after restore, two or more concurrent clients converging, retry and idempotency, failure paths.
   - Retention pruning rules.
   - Frontend: list states, panel behavior, keyboard navigation, confirmation flow, owner-only restore visibility.
   - Add observability: structured logs and metrics-style counters for snapshot created, skipped, failed, pruned, restore started, succeeded and failed.

QUALITY BAR

- No placeholders, TODOs, mock data, or fake endpoints. Everything is wired to the real database and real collaboration flow.
- Strict typing, no `any` unless unavoidable and commented. Handle errors explicitly. Keep functions focused and files cohesive.
- Do not regress existing behavior: collaboration, viewer read-only enforcement, offline persistence, undo/redo, page operations, presence, sharing and access flows must all still work.
- Never expose binary state or version data to users without document access. Never log document content.
- Be honest: separate what you verified (ran or read) from what you inferred. If something cannot be verified in this environment, say so.

DEFINITION OF DONE
Typecheck, lint, tests and build all pass. Migration applies cleanly on a fresh database and on the existing one. I can open the editor, open history, browse versions, click one and see that exact historical content in the canvas with the floating panel, navigate older and newer, return to the live document, and, as owner, restore with confirmation. After the restore, all connected collaborators see the restored content, and a new `restore` entry plus a `pre_restore` entry appear in history. Editors and viewers cannot restore. Viewers can browse.

FINAL REPORT (when finished)
Give me: (1) what existed vs what you built, (2) a file-by-file change list, (3) every default decision and its rationale, (4) any discrepancies you found between `editor-vision-history.md` and the code, (5) test and build results, (6) known limitations and recommended follow-ups, (7) exact commands to run the migration and try the feature locally.
