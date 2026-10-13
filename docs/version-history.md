# Document version history

## Status and scope

This design describes the code in this branch, not a claim that it has been
deployed or exercised against a live PostgreSQL, Redis, and collaboration
environment. **Confirmed before implementation:** the `document_versions`
table existed in the Drizzle schema and migration `0000`; application code had
no version queries, API, collaboration snapshot hooks, or editor preview. The
sidebar's "Coming Soon" card and landing-page claims were not working feature
evidence. **Built here:** snapshot metadata and queries, authenticated routes,
collaboration-server automatic and named snapshots, a Redis-mediated live
restore, URL-addressable read-only previews, and a history panel.

## Architecture and file map

- `packages/db/src/schema/documents.ts` defines version kinds and snapshot
  metadata; `packages/db/src/queries.ts` contains document-scoped version
  create, list, lookup, cursor, label, count, position, neighbor, and retention
  queries.
- `packages/db/drizzle/0005_sour_black_panther.sql` extends the existing
  versions table, including non-destructive backfill of hashes and byte sizes.
  `0006_stormy_silver_fox.sql` adds the nullable unique restore/checkpoint
  operation ID used for idempotency.
- `packages/shared/src/versions.ts` exports request schemas and response types;
  `roles.ts` owns the history permission helpers.
- `apps/api/src/routes/versions.ts` checks session and document membership on
  every route. The API lists metadata separately from the base64 snapshot
  endpoint and delegates live checkpoints/restores to the collaboration server
  using Redis request/result channels (`lib/version-restore.ts`).
- `apps/collab/src/index.ts` captures dirty Yjs documents, attributes known
  contributors, checkpoints at the configured interval and last disconnect,
  and lazily prunes automatic snapshots.
  `version-restore-listener.ts` validates the actor again, serializes version
  operations per document with a Redis lock, captures the pre-restore state,
  replaces the live Yjs structures, persists the merged state, and broadcasts
  a stateless restore notice.
- `apps/web/src/hooks/use-document-versions.ts` provides the TanStack Query
  API. `version-history-panel.tsx` provides history, naming, and labels;
  `version-preview-panel.tsx` provides preview details and restore
  confirmation. `editor-extensions.ts` is shared by live and preview editors.
  Preview decoding creates a standalone Y.Doc and never attaches the
  collaboration provider or IndexedDB persistence.

## Data model and retention

Every row stores a complete `Y.encodeStateAsUpdate` snapshot in `state`, its
SHA-256 content hash, byte size, kind (`auto`, `named`, `restore`, or
`pre_restore`), optional label, nullable author, contributor IDs, and optional
restored-from and operation IDs. The pre-existing `(document_id, created_at)`
index remains; cursor, hash, restore-reference, and operation-ID indexes are
additive. Old rows receive an MD5 of their base64-encoded state as a migration
backfill hash and their actual byte length. No rows are deleted or rewritten.
Contributor IDs are retained internally for attribution; API responses expose
only a contributor count, not the raw ID list. The collab server re-hashes a
legacy snapshot with SHA-256 when comparing it to current state, so an existing
row does not cause an otherwise unchanged first automatic checkpoint.

Full snapshots cost more storage than incremental updates or diffs, but are
self-contained: previews do not replay a potentially broken chain, restores
have a stable target, and pruning one automatic version cannot invalidate
later versions. Snapshots are capped at 10 MiB; larger snapshots are skipped
or rejected with an explicit API error. The code does not compress snapshot
bytes.

Automatic snapshots are considered on the existing collaboration store flow
and at last disconnect. They require a changed hash; periodic snapshots also
require 10 minutes since the previous automatic snapshot. Last disconnect
bypasses the interval but still deduplicates unchanged content. These values
are constants in `apps/collab/src/index.ts`. Known user IDs from authenticated
collaboration contexts are stored as contributors; the first is the primary
author. Unknown authors are shown as "Synodos system".

Retention is lazy: after an automatic snapshot is written, old automatic rows
are thinned to all rows under 24 hours, one per hour from 24 hours through
7 days, one per day from 7 through 30 days, and none after 30 days. Named,
restore, and pre-restore rows are never pruned. A pruning failure is logged and
does not discard the newly saved snapshot.

## API and authorization

All routes use `requireUser`, validate IDs and bodies with shared Zod schemas,
and check membership before looking up a version. Thus non-members get 404 and
a version ID cannot be used across documents. Owners, editors, and viewers can
list metadata, fetch a snapshot, and navigate to an adjacent version. Owners
and editors can create named checkpoints and change labels. Only owners can
restore; the collaboration service repeats the role check using the actor ID
from the authenticated API request.

| Route | Behavior |
| --- | --- |
| `GET /api/documents/:id/versions?cursor=&limit=` | Newest-first metadata page; state bytes are never included. |
| `GET /api/documents/:id/versions/:versionId` | Metadata and base64 snapshot, with position and total; enforces the 10 MiB limit. |
| `GET /api/documents/:id/versions/:versionId/neighbor?direction=older\|newer` | Document-scoped adjacent metadata. |
| `POST /api/documents/:id/versions` | Creates a named snapshot from the live collaboration document. |
| `PATCH /api/documents/:id/versions/:versionId` | Sets or renames a label. |
| `POST /api/documents/:id/versions/:versionId/restore` | Requests an idempotent restore using a client operation UUID. |

When no collaboration instance has the document loaded or Redis does not
deliver a request/result, named checkpoints and restores fail with
`COLLABORATION_UNAVAILABLE`; the API does not silently restore stale
`document_state`. The API waits up to eight seconds for a result. A restore
request revalidates both the current owner role and target-document association.

## Snapshot, ordering, concurrency, and failures

The collaboration process serializes automatic, named, and restore operations
with a per-document Redis lock. Automatic snapshots hash before insert and
recheck the latest state while serialized. Restore snapshots the current live
Y.Doc as `pre_restore`, decodes the target into a temporary Y.Doc, then applies
the target XML fragment and Y.Map/Y.Array/Y.Text roots to the live document in
one transaction. In particular, the editor's `default` content fragment,
`pageMetadata`, and `editorMigrations` are represented by the copied shared
types. The collaboration server saves the resulting state and normal Yjs
updates propagate through Hocuspocus and Redis; a `restore` row records the
target and operation ID.

The request lock prevents concurrent restore/checkpoint/snapshot operations
from the application's collaboration instances. Since live edits do not take
that lock, restore re-hashes the live Y.Doc immediately before applying the
target; if it changed while the pre-restore state was being persisted, restore
returns `409 DOCUMENT_CHANGED` without replacing the live content. This is not
a global transaction across Redis, PostgreSQL, and all clients: a process crash
after the live mutation but before the restore row is committed can require an
operator to inspect the `pre_restore` entry and retry. Redis publication or
collaboration availability errors return explicit failures; no success is
inferred from a timeout. Snapshot bytes and document content are not written to
logs.

The current final-disconnect trigger uses Hocuspocus's `clientsCount`, which is
local to a collaboration process. If the service is deployed with multiple
collaboration processes, a last local disconnect can trigger an early
checkpoint even while another process still has clients. Hash deduplication
prevents unchanged duplicates; a distributed connection-count registry would
be needed to make that trigger globally exact.

An offline client can reconnect with edits based on an older Yjs state. Those
pending CRDT edits may merge back into the restored document; restore is a
forward event, not destructive time travel. The confirmation dialog states
this limitation. `pre_restore` provides an undo target for the state immediately
before restoration.

## Frontend behavior

The selected version is stored in the editor URL as `?version=<uuid>`. A
missing/deleted version clears the query parameter and returns to live mode.
The live editor, provider, and offline persistence remain mounted underneath a
separate read-only editor configured with the same Tiptap extension factory.
The live editor is not reinitialized when the selected history URL parameter
changes, and a preview render exception is contained to the preview canvas so
the live document remains available.
The preview Y.Doc has no Hocuspocus provider and is not written to IndexedDB.
Page nodes/titles, tables, images, lists, tasks, highlights, alignment, and
links use the same editor schema as the live editor.

The sidebar shows day-grouped versions, author metadata, relative timestamps
with absolute-time titles, labels, kind badges, loading/error/empty states, and
load-more pagination. Editors and owners can name a current checkpoint and
rename labels. The floating preview panel identifies the snapshot and its
position, navigates older/newer, returns to the live document, and presents an
owner-only restore confirmation. A persistent text banner identifies preview
mode; Escape returns to the live document and arrow keys navigate history.
Access revocation remains governed by the existing live-room access handling.

## Security and privacy

Snapshot state is returned only by the authenticated, membership-checked
single-version endpoint; list and neighbor responses are metadata only. Role
checks are server-side, author identity is the session subject, and cross-
document version IDs return 404. The collab listener rechecks ownership before
restoration. Logs contain IDs, event names, sizes, and failure reasons only.
The internal Redis channels are intended for trusted application services and
must not be exposed to untrusted Redis clients.

## Decisions and rationale

- **Full snapshots:** self-contained previews/restores and no replay-chain
  failure outweigh the storage cost at current app scale; the 10 MiB cap and
  30-day automatic retention bound the most direct growth risks.
- **Live Redis requests for named checkpoints and restores:** these actions
  must use the in-memory merged Y.Doc. Falling back to Postgres would produce a
  stale but success-shaped checkpoint or restore.
- **Nullable unique operation ID:** added beyond the initial schema proposal
  to make restore and named-checkpoint retries idempotent without conflating
  ordinary versions.
- **Contributor IDs as JSONB:** this preserves the complete set of user IDs
  since the prior snapshot without another join table; author display data is
  joined from the current user record at read time.
- **No content diff preview:** full-snapshot rendering uses the existing
  editor and avoids inventing a second document schema or exposing diffs.

## Test and release plan

Run the app's web lint, tests, and production build, and the database, API, and
collaboration TypeScript checks. Yjs-only tests cover isolated preview decoding
and live structure replacement without requiring external services. Before
release, run migration tests against both a fresh PostgreSQL database and a
copy containing legacy `document_versions` rows; run an integration environment
with PostgreSQL, Redis, the API, and multiple collaboration clients to verify
role matrix, dedupe/interval/last-disconnect behavior, multi-client convergence,
Redis timeouts, idempotent retries, and retention boundaries. Those external
service and browser-level integration checks have not been run in this
environment.

Apply the generated migrations using the existing Drizzle command:

```sh
pnpm --filter @synodos/db db:migrate
```

Then run API, collaboration, and web services with the repository's existing
`.env` and `pnpm dev` setup. PostgreSQL and Redis must be available; to exercise
history, open a document, make edits, wait for the automatic interval or close
the last room connection, then open the history sidebar. Named checkpoints and
restore require the active collaboration service to be available.
