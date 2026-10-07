# Synodos: how the three apps work together

This guide explains the repository in beginner-friendly terms. It follows the important code paths rather than repeating every punctuation mark in every file. When it says “line by line,” it means each important statement or small group of statements is explained in the order the program uses them.

## The short version

Synodos is a shared-document app. It has three running applications:

| Part          | What it does                                                                         | Usual local address     |
| ------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| `apps/web`    | The page the person sees and uses in their browser.                                  | `http://localhost:5173` |
| `apps/api`    | Normal HTTP endpoints: sign-in, document lists, titles, membership, and permissions. | `http://localhost:4000` |
| `apps/collab` | A Hocuspocus WebSocket server that synchronizes live Yjs document changes.           | `ws://localhost:1234`   |

There are also two important shared packages:

- `packages/db` gives the API and collaboration server the same PostgreSQL tables and database helpers.
- `packages/shared` gives the apps the same role names, validation rules, and access-change event format.

Think of the web app as the classroom, the API as the office that checks names and keeps the class list, and the collaboration server as the whiteboard that everyone can write on at the same time. PostgreSQL is the durable filing cabinet. Redis is the fast message board used to tell servers about collaboration and access changes.

## Big picture: two kinds of traffic

The browser uses **two different connections** for two different jobs:

1. It sends normal HTTP requests to `apps/api` for account information and document metadata (such as a title or a member's role).
2. When a document is open, it connects to `apps/collab` over WebSocket. That connection carries the changing Yjs document and temporary presence information such as cursor/selection.

The API is not the live text-sync server. The collaboration server is not the place where the browser asks for its dashboard or signs in. Both servers use the same PostgreSQL data, and Redis lets them coordinate events.

```text
Browser (apps/web)
  ├── HTTP + session cookie ──> apps/api ──> PostgreSQL
  │                              └────────> Redis publish (access changed)
  └── WebSocket + signed token ─> apps/collab ──> PostgreSQL (saved Yjs state)
                                  └───────────> Redis (cross-server collaboration)
```

## 1. `apps/web`: the browser application

`apps/web` is a React 19 and TypeScript single-page application built with Vite. The source is under `apps/web/src`.

### Startup and page selection

- `apps/web/src/main.tsx` (lines 1–24) is the browser entry point. It creates the React root, then wraps the app in the React Query provider (shared cached server data), theme provider, and browser router; it also mounts the global toast UI.
- `apps/web/src/App.tsx` (lines 9–29) declares the routes (`:id` is the document ID in `/docs/:id`). Login/signup are public-only; dashboard pages and the editor require a session; an unknown route goes to the dashboard overview.
- `apps/web/src/components/route-guards.tsx` (lines 13–31) calls `authClient.useSession()`. While the session is loading it shows a spinner; an unauthenticated visitor is sent to `/login` while keeping their intended destination; an already signed-in visitor on login/signup is sent to the overview.
- `apps/web/src/components/app-layout.tsx` and `app-sidebar.tsx` provide the shared dashboard frame and navigation. The editor is a separate full-screen route.

The UI is split into pages, reusable components, hooks, and small helper modules:

| Location                           | Responsibility                                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/pages/auth.tsx:19–60`         | Email sign-in/sign-up and Google sign-in; successful login returns to the original requested page when there is one. |
| `src/pages/overview.tsx:9–90`      | Loads and divides the document list into owned and shared tabs.                                                      |
| `src/pages/editor.tsx:1–63`        | Fetches the selected document metadata and mounts the Hocuspocus WebSocket/room.                                     |
| `src/pages/profile.tsx`            | Profile page.                                                                                                        |
| `src/components/documents/*`       | Document cards, grid, create/rename/delete controls, and role badge.                                                 |
| `src/components/editor/*`          | Tiptap workspace, toolbar/title, connection status, presence UI, sidebar, and sync-error UI.                         |
| `src/hooks/use-documents.ts:6–125` | React Query hooks for document list/detail and member data/mutations.                                                |
| `src/hooks/use-presence.ts:1–45`   | Turns Hocuspocus awareness entries into the list of active people shown by the UI.                                   |
| `src/lib/api.ts`                   | The common authenticated HTTP `fetch` helper.                                                                        |
| `src/lib/auth-client.ts:1–8`       | Better Auth browser client, including the JWT plugin used for collab tokens.                                         |
| `src/lib/collab.ts:1–12`           | Collaboration WebSocket URL and function that asks Better Auth for a collab token.                                   |

### Ordinary API calls

`src/lib/api.ts` is a small wrapper around `fetch`. It prefixes the configured API URL, includes browser credentials/cookies, and turns non-success HTTP responses into an `ApiError` with a status and message. `src/lib/auth-client.ts` configures Better Auth's React client against the same API origin and uses `credentials: "include"` so the browser sends its session cookie.

`src/hooks/use-documents.ts` wraps those requests in React Query:

- query keys separate document lists, a document's details, and its member list in the browser cache;
- queries call `GET /api/documents`, `GET /api/documents/:id`, and `GET /api/documents/:id/members`;
- mutations call the matching create, rename, delete, add-member, or remove-member API route;
- deleting a document immediately removes it from the visible list/detail cache, then invalidates the list to reconcile with the server.

`src/pages/overview.tsx` divides loaded rows into “mine” (role is owner) and “shared” (any non-owner role). `?tab=shared` selects the shared tab; otherwise it starts on mine. The search field is currently rendered disabled. `create-document-button.tsx` creates a document and navigates straight to `/docs/<new-id>`. Document cards use the shared `canEdit()` / `canManageMembers()` rules to decide which actions to show. The rename dialog validates a title with the shared schema before sending it. The editor's `title-input.tsx` also renames through the API (on blur or Enter), and restores the previous title when input validation fails.

In the editor, owners open the invite dialog from the header. It asks for an email and an Editor/Viewer role; the collaborator list shows every member, their online/offline state, and a role badge with permission details on hover. Removal controls are shown only to owners.

These are the control-plane requests: changing a title or membership does not edit the live Yjs text. The server route is the authority even when the UI hides an action; UI permission checks are for a clear interface, not a replacement for server checks.

The API also has an owner-only member-role PATCH route. The current browser-side document hooks list add/remove member mutations, but no role-change mutation, so an API capability does not necessarily mean there is a current UI action for it.

### How live text editing fits

The editor route fetches document details with `useDocument(id)`. Once it has the ID and metadata, `src/pages/editor.tsx` renders `HocuspocusProviderWebsocketComponent` pointed at `COLLAB_URL`, then a `HocuspocusRoom` named with the document ID and given `getCollabToken`. `src/lib/collab.ts` uses `VITE_COLLAB_URL` (default `ws://localhost:1234`) and calls `authClient.token()` to get the JWT. The provider owns the Yjs `document`; the editor workspace obtains that same document with `useHocuspocusProvider()` and shares it with Tiptap.

`src/components/editor/editor-workspace.tsx` builds the current-user identity and handles authentication events (roughly lines 26–79), then configures Tiptap with StarterKit, a placeholder, the Collaboration extension, and CollaborationCaret (roughly lines 80–110). It turns off Tiptap's own undo/history because Yjs supplies the collaborative undo behavior. `EditorContent` renders the actual editor. The workspace only allows editing when `canEdit(doc.role)` is true and access has not been lost. Authentication failures become a sync error; if the reason is `Forbidden`, it marks the document inaccessible and clears the local offline copy; a successful authentication clears the error and refreshes document metadata. Other sync errors can be retried on the existing provider without reloading the whole page. If a fresh sign-in is needed, the editor links to a re-authentication route that returns the user to the same document, even if a browser session still exists.

`src/components/editor/connection-status.tsx` reads provider connection and sync status. It can show “Connecting…,” “Saving…,” “Offline,” or “Saved locally,” depending on the socket/sync state and whether local persistence is available. Title editing remains a separate HTTP operation.

### How one user's cursor reaches another user's screen

There are two things people casually call “the cursor”: the caret/selection drawn inside the text editor, and the small collaborator avatars/list in the app UI. They are related by Awareness but rendered by different code. The live path is:

1. In `editor-workspace.tsx` (around lines 55–96), the current person is represented by a small user object (`id`, display `name`, and a deterministic `color` from `src/lib/colors.ts`). That object is passed to `CollaborationCaret.configure({ provider, user })`.
2. Tiptap's collaboration-caret extension watches the editor selection and publishes that user's caret/selection as **Yjs Awareness** on the same Hocuspocus provider. The browser does not write the cursor into the shared document body.
3. Hocuspocus sends awareness to the other connections in the same document room. The Hocuspocus Redis extension enables that collaboration traffic to reach users even when their sockets land on different collab-server processes.
4. In the other browser, the provider exposes awareness. `src/hooks/use-presence.ts` (lines 24–45) calls `useHocuspocusAwareness()`, ignores entries without a user ID, and reshapes awareness into a `PresenceUser` list (identity, color, online/typing hints, and connection count). If one person has multiple connections, it combines them and counts the connections.
5. Tiptap's CollaborationCaret extension itself draws the remote caret/selection inside the editor. React does not build a custom cursor overlay. Separately, `PresenceAvatars` in the editor header and the active-collaborator list in `editor-sidebar.tsx` show who is present. `presence.tsx` contains avatar/list UI; its `CollaboratorsPanel` exists but is not the primary workspace's active collaborator display.
6. When a connection goes away, its temporary awareness disappears and remote presence/caret is no longer shown.

In plain terms: the browser does not send a cursor to the normal API. Cursor data is temporary presence shared on the live connection, not saved document content in PostgreSQL. The text edits themselves are separate Yjs document updates, which Hocuspocus later persists.

### Offline persistence in the browser

`src/hooks/use-offline-persistence.ts` (lines 6–35) constructs `IndexeddbPersistence` around the same `provider.document` and flips `savedLocally` when IndexedDB has synced. The database name is `synodos:<userId>:<docId>` from `src/lib/offline.ts` (lines 1–19), so different users/documents do not share a single local cache. The hook does nothing until there is a user ID. When the collab server says `Forbidden`, the editor calls its `clear()` function to remove that document's local data, rather than leave an unauthorized cached copy readable in the UI. The local cache is not the server database and does not replace PostgreSQL.

`clearOfflineData()` is also available as a helper, but its cleanup is intentionally best-effort. The connection indicator can say “Saved locally” while disconnected if local persistence is available; that does not mean the server has received the latest change yet.

## 2. `apps/api`: ordinary HTTP API and identity

`apps/api/src/index.ts` (lines 10–71) creates a Fastify server, enables CORS for the configured web origin and local development origins, registers the document and user route groups under `/api`, and exposes `/health`. It also forwards `/api/auth/*` requests to Better Auth and exposes `/api/me` for the current session.

The global error handler turns Zod validation errors into `400 Invalid request` responses with issue details. Other errors are logged; the response avoids exposing internal error details for server errors.

### Environment and database connection

- `src/env.ts` validates required environment settings at startup. Invalid/missing values stop startup instead of silently using a fake value. `PORT` defaults to `4000`.
- `src/db.ts` calls `createDb(DATABASE_URL)` from `@synodos/db`.
- `packages/db/src/client.ts` creates a PostgreSQL connection pool and a Drizzle client with the shared schema.

### Authentication

`src/auth.ts` (starting at line 8) configures Better Auth with the PostgreSQL/Drizzle adapter, email/password sign-in, Google sign-in, trusted web origins, and the JWT plugin. The JWT plugin is important because the collaboration server uses a signed token to check a WebSocket connection.

`src/lib/require-user.ts` is a Fastify pre-handler used on protected route groups. It asks Better Auth to read the session from the incoming request headers/cookies. If there is no valid session it sends `401 Unauthorized`; otherwise it attaches the authenticated user to the request for the route to use.

`/api/auth/*` is the Better Auth endpoint bridge. `/api/me` returns the current session or `401`. The collaboration server does not simply trust an arbitrary user ID sent by the browser: it verifies the signed JWT using Better Auth's public JWKS endpoint.

### Document routes

`src/routes/documents.ts` first installs `requireUser` for every route in the group. The route handlers then use shared Zod schemas to validate IDs and request bodies, database queries to read/write, and shared permission helpers to decide who may do what.

| Route                                                            | Purpose and important rule                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /api/documents` (`documents.ts:27`)                         | Lists documents for which the current user has a `document_members` row; newest updated first.               |
| `POST /api/documents` (`documents.ts:44`)                        | Validates the title, inserts a document and an owner membership in one transaction, returns the new summary. |
| `GET /api/documents/:id` (`documents.ts:68`)                     | Returns a document summary only if the user has a role on it.                                                |
| `PATCH /api/documents/:id` (`documents.ts:85`)                   | Renames a document; owner/editor may edit, viewer may not.                                                   |
| `DELETE /api/documents/:id` (`documents.ts:110`)                 | Owner-only deletion. It also publishes an access event to disconnect open collaboration sessions.            |
| `GET /api/documents/:id/members` (`documents.ts:121`)            | Lists members after confirming the caller has document access.                                               |
| `POST /api/documents/:id/members` (`documents.ts:139`)           | Owner-only invite/add/update role by email; enforces the shared member limit inside a transaction.           |
| `PATCH /api/documents/:id/members/:userId` (`documents.ts:204`)  | Owner-only editor/viewer role change; does not allow changing the owner.                                     |
| `DELETE /api/documents/:id/members/:userId` (`documents.ts:228`) | Owner-only removal; does not allow removing the owner.                                                       |

`GET /api/users/search?q=...` and `GET /api/users` in `src/routes/users.ts` are also session-protected. They return a limited set of other users for the sharing/invite UI, excluding the signed-in user.

### Shared permissions and validation

`packages/shared/src/roles.ts` (lines 3–12) defines exactly three roles: `owner`, `editor`, and `viewer`. `canEdit()` returns true for owner/editor and false for viewer/no role. `canManageMembers()` is true only for owner. The API uses these helpers for HTTP changes; the collaboration server uses `canEdit()` before permitting live edits. This makes the same role rule apply in both places.

`packages/shared/src/documents.ts` contains request schemas and types shared across the codebase: UUID document IDs, trimmed title length rules, valid invite roles, the member limit (10 including the owner), and document summary/member shapes. Zod validates data at runtime; TypeScript types help the compiler catch mismatches while writing code.

One helpful detail when following a request in the code: route handlers validate the URL/body first, then find the caller's role with `getDocumentRole()` in `packages/db/src/queries.ts`, then make the change only if that role is allowed. That helper searches `document_members` for the exact document ID and user ID; it returns the role or `null`. A missing membership is therefore not accidentally treated as a low-privilege role—it means no access.

## 3. `apps/collab`: Hocuspocus and Yjs server

`apps/collab/src/index.ts` (roughly lines 18–96) starts the dedicated Hocuspocus server. Hocuspocus is the WebSocket host and room manager; Yjs is the shared data model that safely combines simultaneous edits.

### Startup, persistence, and cross-instance messaging

The server validates `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_URL`, and `COLLAB_PORT` at startup. It creates a Drizzle database client, then builds a remote JWKS verifier pointing at Better Auth's `/api/auth/jwks` endpoint.

The Hocuspocus configuration is the heart of the collab app (`apps/collab/src/index.ts`, starting around line 30):

- `name` identifies this server process; `port` defaults to `1234`.
- `debounce: 2_000` waits about two seconds after the last update before storing. `maxDebounce: 10_000` means constant typing still causes a store at least about every ten seconds.
- `new Redis(...)` installs Hocuspocus's Redis extension with the parsed Redis URL and a `synodos` prefix. This is for collaboration coordination across Hocuspocus instances; it is not the durable document database.
- `new Database(...)` installs Hocuspocus's database extension. Its `fetch` loads saved binary Yjs state from PostgreSQL when a document room is first needed. Its `store` updates the document's `updated_at` timestamp and saves the binary state through an upsert. If the document row has already been deleted, the store returns without trying to recreate that document's state.

In `packages/db/src/queries.ts` (functions start at lines 7, 20, and 32), `getDocumentRole()` checks membership, `loadDocumentState()` reads `document_state.state`, and `saveDocumentState()` turns the Yjs bytes into a Node `Buffer` and inserts or updates the row. `packages/db/src/schema/columns.ts` defines PostgreSQL `bytea` as a Buffer-backed custom type. Yjs state is binary data, so it is stored as bytes rather than as a human-readable text string.

### WebSocket authentication and read-only access

The `onAuthenticate` callback runs as a client tries to join a document:

1. It rejects a missing token.
2. It verifies that the room/document name is a UUID.
3. It verifies the signed token with the remote JWKS and checks issuer/audience against `BETTER_AUTH_URL`. The token subject (`sub`) becomes the trusted user ID. Invalid tokens are rejected as `Unauthorized`.
4. It calls `getDocumentRole(db, userId, documentName)`. No membership means `Forbidden`.
5. If `canEdit(role)` is false, it marks the connection `readOnly`. A viewer may observe the collaborative document but should not send edits.
6. It returns the trusted `userId` and `role` as connection context. The access-change listener uses that context to identify which socket to close later.

This is why HTTP login and WebSocket login work together: Better Auth issues the token, but the collaboration server verifies it itself and independently checks current membership in PostgreSQL.

### Yjs document and saved state, simply explained

Yjs is like a shared notebook whose changes have IDs and can be merged. Each browser holds a local `Y.Doc`; the Hocuspocus provider exchanges updates with the server. Yjs is designed so concurrent edits can merge rather than one person's entire copy blindly overwriting another's.

The live Yjs document is loaded from PostgreSQL by the database extension, held in memory while its room is active, and saved back after a quiet period (with a maximum delay during continuous updates). The persisted state is the collaboration document's content, not cursor location. Database tables for document versions exist in the schema, but the inspected apps do not currently expose a version-history API or use those rows in the normal editor flow.

### Access changes after a socket is already connected

`apps/api/src/lib/access-events.ts` (lines 5–15) publishes a JSON event to the Redis channel named by `ACCESS_CHANNEL` whenever membership/role access changes or a document is deleted. The database change is the durable truth. Redis publishing catches/logs errors rather than undoing the already-completed API change, so immediate socket revocation depends on Redis being available; a later new socket connection still checks current PostgreSQL membership.

`apps/collab/src/access-listener.ts` (lines 7–36) subscribes to that same channel:

- It parses and validates each message with the shared Zod schema; malformed messages are ignored with a warning.
- `userId: null` means the document was deleted, so it closes every connection for that document.
- A non-null user ID means that user's access or role changed. If that document is open on this server instance, it closes only that user's connections. Their next attempt must authenticate and check the new database role.
- If the room is not open on this instance, there is nothing local to close.

Redis pub/sub is important here because API and collaboration servers may be separate processes. The API cannot reach into another process's memory to close a socket, so it publishes an event that every collaboration instance can hear.

On SIGINT/SIGTERM, the server stops the Redis listener, flushes pending document stores, destroys Hocuspocus, and exits. Flushing helps avoid losing recent edits during a normal shutdown.

## 4. Redis: exactly what it is doing here

The environment example gives `REDIS_URL=redis://localhost:6379`; `docker-compose.yml` starts Redis 7 locally. Redis is shared by the API and collaboration service but used in two related ways:

| Use                        | Publisher                         | Receiver                                               | Why                                                                                                 |
| -------------------------- | --------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Hocuspocus Redis extension | Collaboration connections/servers | Other Hocuspocus server instances                      | Coordinates live collaborative room traffic when users are connected to different server processes. |
| Access-change pub/sub      | API (`publishAccessChanged`)      | Every collaboration process (`listenForAccessChanges`) | Disconnects sockets when a member is removed, demoted, or a document is deleted.                    |

Redis is **not** where the canonical account, membership, title, or saved Yjs state lives. PostgreSQL stores those. Redis is the fast coordination/message path; PostgreSQL is the durable store.

`apps/collab/src/redis-config.ts` parses `redis://` or `rediss://` into the host, port, optional username/password, and optional TLS options expected by Hocuspocus's Redis extension. The API uses `ioredis` directly to publish; the collab listener uses a separate Redis subscriber connection because Redis subscriber connections are dedicated to subscriptions.

## 5. PostgreSQL: the durable records

The schema is in `packages/db/src/schema` and the initial migration is `packages/db/drizzle/0000_rich_proteus.sql`.

- `user`, `session`, `account`, `verification`, and `jwks` hold Better Auth identity/session/JWT-key records.
- `documents` holds a UUID, title, owner ID, and created/updated times.
- `document_members` is the access list: one row per document/user pair with a role. The owner is also recorded as a member.
- `document_state` has one row per document containing the latest binary Yjs state.
- `document_versions` is a schema table for version snapshots, but no active route in the inspected app writes or reads it.

Foreign keys cascade when a user/document is deleted. In particular, deleting a document removes its membership and saved-state rows, while the API sends a Redis event to disconnect users who still have its live room open.

The document membership primary key is the pair `(document_id, user_id)`, so the same person cannot accidentally have duplicate roles for one document. When adding a member, the API locks the document row inside a transaction, counts current members, checks the 10-person limit, and inserts or updates the membership. The lock ensures two owners adding people at nearly the same time cannot both pass a stale member-count check.

## 6. A complete “two people edit together” story

1. Alice signs in through the web app. Better Auth stores/reads her session in PostgreSQL.
2. The web app asks the API for her documents. The API checks her session, looks up her membership rows, and returns document summaries.
3. Alice opens `/docs/<document-id>`. The browser asks Better Auth for a JWT and opens a Hocuspocus WebSocket with the document ID and token.
4. `apps/collab` verifies the JWT, finds Alice's role in PostgreSQL, and rejects her if she has no access. It marks a viewer read-only.
5. Hocuspocus loads the saved Yjs state from PostgreSQL (or begins an empty shared doc), then synchronizes it to Alice's browser.
6. Alice types in Tiptap. Tiptap updates the browser's Yjs document; the provider sends Yjs updates to Hocuspocus. Other connected browsers receive and merge those updates.
7. Bob's cursor/selection is sent as Yjs Awareness presence through the live provider; it is displayed by the other editor but is not stored with the document's durable content.
8. After updates settle, Hocuspocus stores the encoded Yjs state in PostgreSQL. Redis helps relay collaboration traffic if Alice and Bob are on different collab processes.
9. If an owner removes Bob, the API commits the membership change and publishes an access event. Each collab instance closes Bob's matching connection. A new connection attempt checks PostgreSQL and is denied.

## 7. Local setup and useful settings

`docker-compose.yml` starts PostgreSQL and Redis; it does not itself start the three Node apps. The root uses pnpm workspaces and Turborepo.

The root `.env.example` documents the main settings:

| Setting                                    | Used for                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | PostgreSQL connection used by API and collab.                                                                                                                             |
| `REDIS_URL`                                | Redis URL shared by the API and collab.                                                                                                                                   |
| `VITE_COLLAB_URL`                          | Browser WebSocket destination.                                                                                                                                            |
| `VITE_API_URL`                             | Browser HTTP/auth API destination; if omitted, the web clients use `http://localhost:4000`. This is referenced in web code but is not currently listed in `.env.example`. |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`    | Better Auth session/JWT signing and public URL.                                                                                                                           |
| `WEB_ORIGIN`                               | Allowed browser origin for CORS/auth.                                                                                                                                     |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in configuration.                                                                                                                                             |

The API and collab package `dev` scripts load the root `.env`. The web app is served by Vite; its `vite.config.ts` sets `envDir` to the repository root so Vite can read root-level `VITE_` variables.

`apps/collab/scripts/smoke.ts` is a small end-to-end probe: it signs in over HTTP, gets a token, creates a document if requested, then uses a Hocuspocus provider to read/write/watch a Yjs text type. It is useful for confirming the HTTP auth, document access, WebSocket, and persistence path are connected.

## 8. Useful things to remember

- Document title and membership are **metadata** changed over HTTP; the shared editor body is **Yjs state** changed over WebSocket.
- A role is checked twice for different entry points: HTTP routes protect metadata actions, and the collaboration server protects WebSocket document access.
- Cursor/presence is **temporary Awareness state**, not permanent document text and not a PostgreSQL row.
- Redis coordinates processes and carries events; PostgreSQL persists the important records and saved Yjs state.
- `packages/shared` and `packages/db` are why API and collab can use matching rules and schemas instead of inventing separate versions.
