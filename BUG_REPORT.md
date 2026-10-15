Synodos Full Codebase Bug & Security Audit (BUG_REPORT.md)

| Rank | Severity | App / Package          | File(s)                                                                                              | Bug Summary                                                                                                                                                                                                                                 |
| ---- | -------- | ---------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1   | CRITICAL | apps/collab            | src/version-restore-listener.ts                                                                      | Version Restore Is Completely Broken in Production: Y.applyUpdate leaves snapshot.share types as generic Y.AbstractType instances, so instanceof Y.XmlFragment / Y.Map is always falseâ€”either doing nothing or wiping the document empty. |
| #2   | CRITICAL | apps/web + apps/collab | src/components/documents/document-card.tsx, src/index.ts                                             | Dashboard Cards Open Full Live Collaboration Rooms: Every visible card on the dashboard opens a writable WebSocket room, triggering forced auto-versions and Redis locks whenever you scroll or leave the dashboard.                        |
| #3   | CRITICAL | apps/api               | src/routes/notifications.ts                                                                          | SSE /api/events Hijacks Response (Breaking CORS) & Leaks Redis Connections: reply.hijack() + reply.raw.writeHead(200) bypasses @fastify/cors headers, and every open tab spawns a dedicated Redis TCP connection.                           |
| #4   | CRITICAL | apps/collab + apps/api | src/version-restore-listener.ts, src/routes/versions.ts                                              | Checkpoints & Restores Hang for 8s and Fail When Room Isn't in Memory: If a document isn't currently loaded in hocuspocus.documents, the listener silently returns without replying, causing a 503 timeout.                                 |
| #5   | CRITICAL | apps/api               | src/lib/version-restore.ts                                                                           | Missing Redis .on("error") Listener Can Crash the Entire API Server: requestCollaboration creates two temporary ioredis clients per call without error handlers; a single Redis blip crashes Node.js.                                       |
| #6   | CRITICAL | apps/web               | src/components/editor/editor-workspace.tsx                                                           | Page Migration Race Condition Duplicates Content & Runs on Viewers: migratePages() runs even for read-only viewers and can duplicate all document content if two editors open an unmigrated/new doc simultaneously.                         |
| #7   | HIGH     | functions + apps/api   | functions/api/[[path]].ts, apps/api/src/index.ts                                                     | Auth Proxy Hardcodes http:// & Backend Hostname: Fastify constructs new URL(request.url, "http://" + request.headers.host) after the proxy strips host, breaking OAuth/cookie origins and streaming bodies.                                 |
| #8   | HIGH     | apps/api               | src/routes/documents.ts                                                                              | Join Request Approval Bypasses 10-Member Limit & Can Throw 500 PK Conflict: Approving a request never checks MAX_DOCUMENT_MEMBERS or existing membership, and accepting an invite can crash on duplicate keys.                              |
| #9   | HIGH     | apps/collab            | src/index.ts                                                                                         | Unawaited flushPendingStores() on Shutdown Causes Data Loss: shutdown() does not await flushPendingStores() before closing Redis and exiting, and never closes the PostgreSQL pool.                                                         |
| #10  | HIGH     | apps/api               | src/index.ts, src/routes/users.ts, package.json                                                      | Rate Limiter Installed But Never Registered + Wildcard User Scraping: @fastify/rate-limit is unused, and /api/users + /api/users/search?q=% allow any user to dump all workspace emails.                                                    |
| #11  | HIGH     | apps/web               | src/components/notification-toast-listener.tsx, src/components/documents/dashboard-collaboration.tsx | Duplicate Real-Time Notification Transports: The app runs both SSE (/api/events) and a Hocuspocus WebSocket (user:<id>) at the same time to invalidate the exact same queries.                                                              |
| #12  | MEDIUM   | apps/collab            | src/redis-config.ts                                                                                  | Redis URL Parser Ignores Database Number (pathname): redisConfigFromUrl drops /1, /2, etc., so Hocuspocus Redis and ioredis can connect to different Redis databases.                                                                       |
| #13  | MEDIUM   | root + apps/web        | turbo.json, apps/web/package.json                                                                    | Broken Turborepo Build Cache & Skipped Frontend Typecheck: turbo.json caches .next/** instead of Vite's dist/**, and apps/web has no check-types script.                                                                                    |
| #14  | MEDIUM   | apps/web               | src/components/route-guards.tsx, src/components/login-form.tsx                                       | Login Redirect Drops Query Params (?version=...) & Loses Destination on Signup: RequireAuth only saves location.pathname, and clicking "Sign up" on /login drops location.state.                                                            |
| #15  | MEDIUM   | apps/web               | src/lib/zoom/zoom-store.ts, src/components/editor/editor-workspace.tsx                               | Global Zoom Singleton Bleeds Between Documents + Stuck Spacebar Panning: zoom is stored in a single global variable across docs, and holding Space + Alt+Tab locks the editor in hand-pan mode.                                             |
| #16  | MEDIUM   | apps/web               | src/hooks/use-notification-preferences.ts, src/lib/audio/sound-engine.ts                             | Duplicate playPresenceSound Function Ignores Mute Settings: Both files export playPresenceSound, but the one in sound-engine.ts ignores mute/volume settings.                                                                               |
| #17  | NORMAL   | apps/web               | src/components/editor/document-export-dialog.tsx                                                     | PDF Print Fires Before Images Load & Markdown Table Export Breaks on Pipes: printAsPdf uses a fixed 300ms timer instead of waiting for images, and markdownBlock doesn't escape `                                                           |
| #18  | NORMAL   | apps/web + root        | src/components/user-avatar.tsx, package.json files                                                   | Sidebar Avatar Ignores Profile Photos, Slices Emojis in Half, & Mismatched TS Versions: UserAvatar in the sidebar never renders user.image, splits UTF-16 surrogates, and TypeScript versions conflict (~6.0.2 vs 7.0.2).                   |

ðŸ”´ CRITICAL BUGS (Fix These First!)
Bug #1: Version Restore Wipes or Ignores the Document in Production

- Where it lives: apps/collab/src/version-restore-listener.ts (lines 318â€“321 and 362â€“399) and apps/collab/src/version-state.test.ts.
- Explain it like I'm 12:
  Imagine a LEGO box (Y.Doc) that arrives in the mail sealed in bubble wrap (Uint8Array binary bytes). Until you open each inner bag and label it "this bag is a LEGO Castle (Y.XmlFragment)" or "this is a Sticker Sheet (Y.Map)", Yjs just labels every bag as "Mystery Bag (Y.AbstractType)".
  In your unit test (version-state.test.ts), you built the snapshot document by calling snapshot.getXmlFragment("default") and snapshot.getMap("pageMetadata"), which opened the bags and labeled them.
  But in real life (version-restore-listener.ts), you create const snapshot = new Y.Doc(); Y.applyUpdate(snapshot, target.state); and immediately pass it to replaceDocumentState(document, snapshot). Because you never called snapshot.getXmlFragment("default") or snapshot.getMap(...), snapshot.share.get("default") is still a "Mystery Bag" (Y.AbstractType), so source instanceof Y.XmlFragment is always false!
  Even worse: if current (target.share.get("default")) was opened, line 369 (current.delete(0, current.length)) deletes your entire live document, and then line 370 (if (source instanceof Y.XmlFragment)) evaluates to false and inserts nothingâ€”leaving your restored document completely blank!
- How to fix it:
  Instantiate the known shared types (getXmlFragment("default"), getMap("pageMetadata"), getMap("editorMigrations")) on both target and snapshot before copying them in replaceDocumentState.
  // apps/collab/src/version-restore-listener.ts
  export function replaceDocumentState(target: Y.Doc, snapshot: Y.Doc) {
  // 1. Force Yjs to instantiate the concrete shared types on both docs first!
  const targetDefault = target.getXmlFragment("default");
  const snapshotDefault = snapshot.getXmlFragment("default");

const targetPageMeta = target.getMap<string>("pageMetadata");
const snapshotPageMeta = snapshot.getMap<string>("pageMetadata");

const targetMigrations = target.getMap<boolean>("editorMigrations");
const snapshotMigrations = snapshot.getMap<boolean>("editorMigrations");

target.transact(() => {
// 2. Replace the main Tiptap XML fragment
if (targetDefault.length) targetDefault.delete(0, targetDefault.length);
targetDefault.insert(
0,
snapshotDefault
.toArray()
.filter(
(item): item is Y.XmlElement | Y.XmlText =>
item instanceof Y.XmlElement || item instanceof Y.XmlText,
)
.map((item) => item.clone()),
);

    // 3. Replace pageMetadata map
    for (const key of [...targetPageMeta.keys()]) targetPageMeta.delete(key);
    for (const [key, value] of snapshotPageMeta.entries()) {
      if (!(value instanceof Y.AbstractType)) {
        targetPageMeta.set(key, structuredClone(value));
      }
    }

    // 4. Replace editorMigrations map
    for (const key of [...targetMigrations.keys()]) targetMigrations.delete(key);
    for (const [key, value] of snapshotMigrations.entries()) {
      if (!(value instanceof Y.AbstractType)) {
        targetMigrations.set(key, structuredClone(value));
      }
    }

}, "version-restore");
}

Bug #2: Dashboard Document Cards Open Full Live Collaboration Rooms

- Where it lives: apps/web/src/components/documents/document-card.tsx (lines 147â€“178, 282â€“297) and apps/collab/src/index.ts (lines 222â€“237).
- Explain it like I'm 12:
  When you look at your Dashboard (OverviewPage), you see a grid of document cards. Right now, every single card on the screen uses <HocuspocusRoom name="{documentId}"> to dial into the live Hocuspocus collaboration server just to draw a tiny 7px thumbnail preview!
  If you have 15 documents on screen, your browser opens 15 active collaboration rooms at the same time. When you scroll down or click into a document, all 15 rooms disconnect at once. On the collab server, onDisconnect sees clientsCount === 0 and thinks "Everyone just finished editing this document! Let's lock Redis and force a new auto-version check!" for all 15 documents.
- How to fix it:
  - In apps/collab/src/index.ts, createAutoVersion already checks if (!changes._dirty) return; inside the Redis lockâ€”move a quick const isDirty = await versionRedis.hexists(changesKey, "_dirty"); if (!isDirty) return; before acquiring the Redis lock (withDocumentVersionLock) so disconnecting from an unedited room on the dashboard never fights for a Redis lock!
  - Even better, add a lightweight preview or summary field to GET /api/documents (or pass a readonly query/context flag) so dashboard cards don't have to spin up full editable Yjs rooms for every card on screen.
    // apps/collab/src/index.ts â€” inside createAutoVersion() BEFORE withDocumentVersionLock:
    async function createAutoVersion(
    documentId: string,
    state: Uint8Array,
    force: boolean,
    ) {
    const changesKey = `synodos:document-version-changes:${documentId}`;
    // Fast exit without acquiring a distributed lock if nobody edited the doc!
    if (!(await versionRedis.hexists(changesKey, "_dirty"))) return;

await withDocumentVersionLock(documentId, async () => {
const changes = await versionRedis.hgetall(changesKey);
if (!changes._dirty) return;
// ... rest of function

Bug #3: SSE /api/events Breaks CORS via reply.hijack() & Leaks Redis Connections

- Where it lives: apps/api/src/routes/notifications.ts (lines 43â€“99) and apps/web/src/components/notification-toast-listener.tsx (lines 24â€“36).
- Explain it like I'm 12:
  Two bad things happen in GET /api/events:
  - The CORS bouncer gets skipped: Fastify has a plugin (@fastify/cors) that stamps a permission slip (Access-Control-Allow-Origin and Access-Control-Allow-Credentials: true) onto responses so your frontend (localhost:5173) is allowed to read responses from your API (localhost:4000). But in /api/events, you call reply.hijack() and reply.raw.writeHead(200, { ... }) directly on Node's raw socket! That wipes out Fastify's CORS headers, so the browser blocks the SSE stream in cross-origin / local dev setups.
  - The Redis phone-line explosion: Every time any user opens a tab, /api/events runs const subscriber = new Redis(env.REDIS_URL). If 50 users open 3 tabs each, your API opens 150 separate Redis connections, all listening to the same channel. Free/starter Redis databases will hit maxclients and crash your whole app!
- How to fix it:
  - Use one shared Redis subscriber in apps/api/src/routes/notifications.ts that fans out messages to an in-memory Map<string, Set<ServerResponse>> of connected users instead of opening a new Redis connection per HTTP request.
  - Copy Fastify's existing CORS headers (reply.getHeaders()) before calling reply.raw.writeHead(200, ...).
    // apps/api/src/routes/notifications.ts
    // 1. Create ONE shared subscriber at module scope:
    const sseClientsByUser = new Map<string, Set<import("node:http").ServerResponse>>();
    const sharedSubscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
    sharedSubscriber.on("error", (err) =>
    console.error("[redis] SSE subscriber error:", err.message),
    );
    void sharedSubscriber.subscribe(NOTIFICATION_CHANNEL).catch((err) =>
    console.error("[redis] SSE subscribe failed:", err),
    );
    sharedSubscriber.on("message", (channel, raw) => {
    if (channel !== NOTIFICATION_CHANNEL) return;
    try {
    const parsed = notificationEventSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return;
    const clients = sseClientsByUser.get(parsed.data.userId);
    if (!clients) return;
    const payload = `event: notification\ndata: ${JSON.stringify({ notificationId: parsed.data.notificationId })}\n\n`;
    for (const res of clients) {
    if (!res.destroyed) res.write(payload);
    }
    } catch {
    // ignore malformed JSON
    }
    });

// 2. Inside app.get("/events", async (request, reply) => { ... }):
app.get("/events", async (request, reply) => {
const userId = request.user.id;
const existingHeaders = reply.getHeaders();
reply.hijack();
reply.raw.writeHead(200, {
...existingHeaders,
"Content-Type": "text/event-stream",
"Cache-Control": "no-cache, no-transform",
Connection: "keep-alive",
"X-Accel-Buffering": "no",
});
reply.raw.write(": connected\n\n");

    let userSet = sseClientsByUser.get(userId);
    if (!userSet) {
      userSet = new Set();
      sseClientsByUser.set(userId, userSet);
    }
    userSet.add(reply.raw);

    const heartbeat = setInterval(() => {
      if (!reply.raw.destroyed) reply.raw.write(": keep-alive\n\n");
    }, 25_000);

    reply.raw.on("close", () => {
      clearInterval(heartbeat);
      userSet?.delete(reply.raw);
      if (userSet?.size === 0) sseClientsByUser.delete(userId);
    });

});

Bug #4: Named Checkpoints & Version Restores Hang for 8 Seconds and Fail When the Document Isn't in Hocuspocus Memory

- Where it lives: apps/collab/src/version-restore-listener.ts (lines 104â€“105 and 219â€“220) and apps/api/src/routes/versions.ts (lines 125â€“265).
- Explain it like I'm 12:
  When you click "Name this version" or "Restore this version", the Fastify API sends a walkie-talkie message over Redis to the Hocuspocus collab server and waits up to 8 seconds for an answer.
  In version-restore-listener.ts, the collab server checks const document = hocuspocus.documents.get(request.documentId); if (!document) return;.
  If nobody is actively connected to that document room right at that millisecond (for instance, your WebSocket briefly blipped, or Hocuspocus unloaded the room while you were reading an old version), the collab server ghosts the APIâ€”it just returns without sending "not-loaded" back! The API waits a full 8 seconds and then throws a 503 Service Unavailable error.
- How to fix it:
  If hocuspocus.documents.get(request.documentId) is undefined (and you are running a single collab instance, or want a fallback), either:
  - Load the state from loadDocumentState(db, request.documentId) in the database when the document isn't currently open in memory, or
  - Immediately publish { status: "failed", reason: "not-loaded" } so the API can either fall back to a database-level checkpoint/restore or return an instant, accurate response instead of hanging for 8 seconds!
    // apps/collab/src/version-restore-listener.ts â€” inside handleCheckpoint:
    const document = hocuspocus.documents.get(request.documentId);
    if (!document) {
    await publisher.publish(
    `${VERSION_CHECKPOINT_RESULT_PREFIX}${request.operationId}`,
    JSON.stringify({
    operationId: request.operationId,
    documentId: request.documentId,
    status: "failed",
    reason: "not-loaded",
    }),
    );
    return;
    }

(And in apps/api/src/routes/versions.ts, if reason === "not-loaded", you can directly checkpoint/restore document_state in Postgres when no live session is active!)
Bug #5: Unhandled Redis Error Events in version-restore.ts Can Crash the Entire Fastify API

- Where it lives: apps/api/src/lib/version-restore.ts (lines 21â€“23).
- Explain it like I'm 12:
  In Node.js, if an ioredis client has a network hiccup and you didn't attach a .on("error", ...) listener to it, Node.js panics with an Unhandled 'error' event and kills your entire server process.
  In access-events.ts and notifications.ts, you remembered to add .on("error", ...). Info-check: in apps/api/src/lib/version-restore.ts, requestCollaboration creates a new publisher and subscriber on every request and attaches zero .on("error", ...) listeners!
- How to fix it:
  Attach .on("error", ...) listeners to both publisher and subscriber immediately after creating them:
  // apps/api/src/lib/version-restore.ts
  const publisher = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
  const subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
  publisher.on("error", (err) =>
  console.error("[redis] version publisher error:", err.message),
  );
  subscriber.on("error", (err) =>
  console.error("[redis] version subscriber error:", err.message),
  );

Bug #6: Multi-Page Migration Runs for Read-Only Viewers & Duplicates Content on Concurrent Open

- Where it lives: apps/web/src/components/editor/editor-workspace.tsx (lines 891â€“943).
- Explain it like I'm 12:
  When a document is opened for the first time, migratePages() wraps any loose paragraphs into a <page> node and sets migration.set("explicitPagesV2", true).
  There are two big problems here:
  - It runs even for Viewers (editable === false) and during Version Previews (selectedVersionId): A viewer isn't allowed to edit the document on the server, so their browser rewrites the document locally while the server ignores it.
  - The Twin-Editor Race: If two editors open a brand-new document at the exact same time, both of their browsers see explicitPagesV2 === undefined and both insert a <page> wrapper into Yjs, resulting in two pages with duplicated content!
- How to fix it:
  - Guard migratePages() with if (!editable || selectedVersionId) return;.
  - Perform the transaction inside provider.document.transact(() => { ... }) only after checking migration.get("explicitPagesV2") and verifying no <page> nodes already exist when wrapping a blank doc:
    // apps/web/src/components/editor/editor-workspace.tsx
    useEffect(() => {
    if (!editor || !editable || selectedVersionId) return;

  const migration = provider.document.getMap<boolean>("editorMigrations");
  function migratePages() {
  if (!provider.synced || migration.get("explicitPagesV2")) return;

  const nodes: ProseMirrorNode[] = [];
  editor.state.doc.forEach((node) => nodes.push(node));
  const existingPages = nodes.filter((node) => node.type.name === "page");
  const looseContent = nodes.filter((node) => node.type.name !== "page");

  // If all nodes are already page nodes, just mark migrated!
  if (existingPages.length > 0 && looseContent.length === 0) {
  migration.set("explicitPagesV2", true);
  return;
  }
  // ... rest of migration

ðŸŸ HIGH-SEVERITY BUGS
Bug #7: Cloudflare Pages Proxy & Fastify Auth Route Mangle Host, Protocol, and Request Streams

- Where it lives: functions/api/[[path]].ts (lines 68â€“88) and apps/api/src/index.ts (lines 45â€“64).
- Explain it like I'm 12:
  When your frontend is hosted on Cloudflare Pages, /api/* requests go through functions/api/[[path]].ts, which forwards them to your Fastify server.
  - The proxy deletes the host header and sets x-forwarded-host and x-forwarded-proto.
  - Then, in apps/api/src/index.ts line 50, your /api/auth/* handler does:
    const url = new URL(request.url, \http://${request.headers.host}`);[span_81](start_span)[span_81](end_span). Because hostwas replaced by the backend's internal hostname andhttp://is hardcoded, Better Auth thinks the request came tohttp://your-backend-hostinstead ofhttps://your-frontend-host`!
- How to fix it:
  In apps/api/src/index.ts, enable trustProxy: true on Fastify and use x-forwarded-proto / x-forwarded-host (or env.BETTER_AUTH_URL) when constructing the Request URL for Better Auth:
  // apps/api/src/index.ts
  const app = Fastify({ logger: true, trustProxy: true });
  // ...
  app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
  const proto = (request.headers["x-forwarded-proto"] as string) || request.protocol || "http";
  const host = (request.headers["x-forwarded-host"] as string) || request.headers.host;
  const url = new URL(request.url, `${proto}://${host}`);

Bug #8: Approving a Join Request Bypasses MAX_DOCUMENT_MEMBERS & Can Throw 500 Database Errors

- Where it lives: apps/api/src/routes/documents.ts (lines 419â€“484 and 525â€“605).
- Explain it like I'm 12:
  You set a rule that a document can have at most 10 people (MAX_DOCUMENT_MEMBERS = 10).
  When someone asks to join (POST /join-requests) or gets invited (POST /invitations), you check the 10-person limit.
  But when the owner clicks "Approve" (POST /documents/:id/join-requests/:requestId/approve), the code never checks if the document is already full, never checks if the user is already a member, and never deletes any pending invitation for that user! If the user is already a member, Postgres crashes with a 500 duplicate primary key error. The same crash can happen in POST /documents/:id/invitations/accept.
- How to fix it:
  Use .onConflictDoUpdate (or .onConflictDoNothing) when inserting into documentMembers in both /join-requests/:requestId/approve and /invitations/accept, and delete any matching documentInvitations row when approving a join request:
  // apps/api/src/routes/documents.ts â€” inside /join-requests/:requestId/approve transaction:
  await tx
  .insert(documentMembers)
  .values({
  documentId: id,
  userId: member.userId,
  role: memberRole,
  })
  .onConflictDoUpdate({
  target: [documentMembers.documentId, documentMembers.userId],
  set: { role: memberRole },
  });
  await tx
  .delete(documentJoinRequests)
  .where(eq(documentJoinRequests.id, requestId));
  await tx
  .delete(documentInvitations)
  .where(
  and(
  eq(documentInvitations.documentId, id),
  eq(documentInvitations.userId, member.userId),
  ),
  );

Bug #9: Collab Server Shutdown Doesn't await Pending Database Saves or Close the Postgres Pool

- Where it lives: apps/collab/src/index.ts (lines 33, 298â€“306).
- Explain it like I'm 12:
  When your collab server restarts (like when you deploy a new version), it receives a SIGTERM signal. Your shutdown function calls server.hocuspocus.flushPendingStores() to save any unsaved typing from the last 2â€“10 seconds, but it doesn't await it (and closes versionRedis right away while store may still be running createAutoVersion)! It also never closes the Postgres connection pool from createDb(env.DATABASE_URL).
- How to fix it:
  Keep pool from createDb(env.DATABASE_URL), await server.destroy() (which flushes pending stores and runs disconnect hooks in Hocuspocus) before closing versionRedis and pool:
  // apps/collab/src/index.ts
  const { db, pool } = createDb(env.DATABASE_URL);
  // ...
  async function shutdown(signal: string) {
  console.log(`${signal} received, flushing pending storesâ€¦`);
  await stopListening();
  await stopVersionRestoreListener();
  await server.destroy();
  await versionRedis.quit();
  await pool.end();
  process.exit(0);
  }

Bug #10: @fastify/rate-limit Is Never Enabled + User Search Allows Wildcard Email Scraping

- Where it lives: apps/api/package.json, apps/api/src/index.ts, and apps/api/src/routes/users.ts (lines 48â€“85).
- Explain it like I'm 12:
  - You installed @fastify/rate-limit in apps/api/package.json, which is like buying a security alarm for your houseâ€”except you never plugged it in inside apps/api/src/index.ts!
  - In apps/api/src/routes/users.ts, GET /api/users dumps 20 random users' names and emails to anyone logged in, and GET /api/users/search?q=% doesn't escape SQL ILIKE wildcards (% and _), so a nosey user can type % to list users without knowing their email.
  - Notice that InviteMemberDialog (apps/web/src/components/editor/invite-member-dialog.tsx) doesn't even use /api/users or /api/users/searchâ€”it uses /api/documents/:id/invitations!
- How to fix it:
  Register @fastify/rate-limit in apps/api/src/index.ts, escape % and _ in /users/search, and remove the unused GET /users endpoint (or restrict /users/search to require at least 3 non-wildcard characters):
  // apps/api/src/routes/users.ts
  const escapeIlike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
// In /users/search:
const pattern = `%${escapeIlike(q)}%`;

Bug #11: Duplicate Real-Time Notification Listeners (SSE + Hocuspocus WebSocket)

- Where it lives: apps/web/src/components/notification-toast-listener.tsx (lines 24â€“36) and apps/web/src/components/documents/dashboard-collaboration.tsx (lines 58â€“86).
- Explain it like I'm 12:
  When you are on the Dashboard, your browser listens for new notifications in two completely different ways at the exact same time:
  - NotificationToastListener opens an SSE connection to /api/events.
  - DashboardCollaboration opens a Hocuspocus WebSocket room named user:<your-id>.
    Whenever someone invites you to a document, both listeners fire at the same time and both tell React Query to refetch /api/notifications and /api/documents twice!
- How to fix it:
  Pick one real-time notification transport (either the Hocuspocus user:<id> room or the fixed SSE /api/events stream with a shared Redis subscriber) and remove the duplicate.

ðŸŸ¡ MEDIUM-SEVERITY BUGS
Bug #12: redisConfigFromUrl Drops the Redis Database Number

- Where it lives: apps/collab/src/redis-config.ts.
- Explain it like I'm 12:
  A Redis URL can end with a database number like redis://localhost:6379/2. ioredis reads that /2 automatically, but redisConfigFromUrl() ignores url.pathname, so @hocuspocus/extension-redis always connects to database 0.
- How to fix it:
  Parse the database index from url.pathname and pass db in options:
  // apps/collab/src/redis-config.ts
  export function redisConfigFromUrl(urlString: string) {
  const url = new URL(urlString);
  const dbIndex = url.pathname.slice(1);
  return {
  host: url.hostname,
  port: Number(url.port || 6379),
  options: {
  username: url.username ? decodeURIComponent(url.username) : undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,
  db: dbIndex ? Number(dbIndex) : undefined,
  tls: url.protocol === "rediss:" ? {} : undefined,
  },
  };
  }

Bug #13: turbo.json Caches .next/** Instead of Vite dist/**, and apps/web Skips check-types

- Where it lives: turbo.json and apps/web/package.json.
- Explain it like I'm 12:
  - turbo.json is configured with "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**"], which is for Next.jsâ€”not Vite! Your Vite app builds into dist/**, so Turborepo isn't caching your frontend builds properly.
  - Running pnpm check-types runs turbo run check-types, which checks apps/api, apps/collab, packages/db, and packages/shared, but completely skips apps/web because apps/web/package.json has no "check-types" script!
- How to fix it:
  - Update turbo.json "outputs" to ["dist/**"].
  - Add "check-types": "tsc -b --noEmit" to apps/web/package.json "scripts".

Bug #14: RequireAuth & LoginForm Lose Query Strings (?version=...) and Redirect State When Signing Up

- Where it lives: apps/web/src/components/route-guards.tsx (line 19) and apps/web/src/components/login-form.tsx (lines 121â€“127).
- Explain it like I'm 12:
  - If a friend sends you a link to a specific version of a doc (/docs/123?version=456) and you aren't logged in yet, RequireAuth only saves location.pathname (/docs/123) and throws away ?version=456.
  - If you land on /login from that link and click "Sign up" because you don't have an account yet, the <Link to="/signup"> doesn't pass state={location.state}, so after signing up you get sent to /dashboard/overview instead of the document your friend shared with you!
- How to fix it:
  Save ${location.pathname}${location.search} in RequireAuth, and pass state={location.state} on the <Link> in LoginForm:
  // apps/web/src/components/route-guards.tsx
  if (!session) {
  return (
  <Navigate
  to="/login"
  replace
  state={{ from: `${location.pathname}${location.search}` }}
  />
  );
  }

// apps/web/src/components/login-form.tsx
  <Link
    to={isSignup ? "/login" : "/signup"}
    state={location.state}
    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
  >
    {isSignup ? "Sign in" : "Sign up"}
  </Link>

Bug #15: Global zoom-store Bleeds Across Docs & Holding Space + Alt+Tab Locks the Editor

- Where it lives: apps/web/src/lib/zoom/zoom-store.ts and apps/web/src/components/editor/editor-workspace.tsx (lines 1052â€“1085).
- Explain it like I'm 12:
  When you hold Space in the editor, it turns your cursor into a "Hand" tool (editor-canvas--hand) and disables clicking inside the text editor (pointer-events: none) until it sees a keyup event for Space.
  If you hold Space and Alt+Tab to another window, the keyup event happens outside the browser! When you come back, the editor is stuck in Hand mode and you can't click or type anything until you press Space again.
- How to fix it:
  Add a window.addEventListener("blur", ...) listener in EditorWorkspaceContent to reset spacePan and dragging whenever the window loses focus:
  // apps/web/src/components/editor/editor-workspace.tsx
  function handleWindowBlur() {
  spacePan = false;
  dragging = false;
  scrollContainer.classList.remove("editor-canvas--dragging");
  scrollContainer.classList.toggle("editor-canvas--hand", handToolActive);
  }
  window.addEventListener("blur", handleWindowBlur);
  // And in cleanup:
  window.removeEventListener("blur", handleWindowBlur);

Bug #16: Duplicate playPresenceSound Export in sound-engine.ts Ignores Mute Preferences

- Where it lives: apps/web/src/lib/audio/sound-engine.ts (lines 284â€“286) and apps/web/src/hooks/use-notification-preferences.ts (lines 161â€“165).
- Explain it like I'm 12:
  You have two functions with the exact same name (playPresenceSound) in two different files. The one in use-notification-preferences.ts checks if the user muted sounds before playing, while the one in sound-engine.ts plays the sound no matter what.
- How to fix it:
  Delete export function playPresenceSound from apps/web/src/lib/audio/sound-engine.ts so there is only one source of truth in use-notification-preferences.ts.

Bug #17: PDF Export Prints Before Images Finish Loading & Markdown Table Export Breaks on Pipes (|)

- Where it lives: apps/web/src/components/editor/document-export-dialog.tsx (lines 142â€“154 and 205â€“225).
- Explain it like I'm 12:
  - When exporting to PDF, printAsPdf opens a popup window, writes the HTML, waits 300ms, and opens the print dialog. If the document has images that take 500ms to load, the PDF prints with blank image boxes.
  - When exporting a table to Markdown (markdownBlock), if a table cell has a | character inside it, it isn't escaped (\\|), which breaks the Markdown table columns.
- How to fix it:
  Escape | and newlines inside table cells in markdownBlock, and wait for printWindow.document.images to load before calling printWindow.print():
  // apps/web/src/components/editor/document-export-dialog.tsx â€” inside case "table":
  case "table":
  return children
  .map((row, index) => {
  const cells = (row.content ?? []).map((cell) =>
  inlineMarkdown(cell.content)
  .replaceAll("|", "\\|")
  .replaceAll("\n", "<br>"),
  );
  const line = `| ${cells.join(" | ")} |`;
  return index === 0
  ? `${line}\n\vert{}${cells.map(() => "---").join(" | ")} |`
  : line;
  })
  .join("\n");

Bug #18: Sidebar UserAvatar Ignores Profile Images, Breaks Emoji Initials, & Workspace TypeScript Versions Conflict

- Where it lives: apps/web/src/components/user-avatar.tsx, apps/web/src/components/app-sidebar.tsx (lines 159â€“174), and package.json files.
- Explain it like I'm 12:
  - When you sign in with Google or GitHub, you have a profile photo (user.image), which shows up on the Profile pageâ€”but AppSidebar uses src/components/user-avatar.tsx, which doesn't accept an image prop at all, so the sidebar only ever shows initials!
  - In user-avatar.tsx and profile.tsx, initials() uses parts[0][0] and source.slice(0, 2). In JavaScript, emojis take up 2 characters (UTF-16 surrogate pairs), so parts[0][0] cuts an emoji in half and displays a broken `` symbol.
  - Across your package.json files, apps/web uses "typescript": "~6.0.2" while the root, apps/api, apps/collab, and packages/db use "7.0.2".
- How to fix it:
  Use Array.from(...) when taking initials so emojis stay intact, pass image={user?.image} into UserAvatar in AppSidebar, and align "typescript" and "@types/node" versions across all package.json files:
  // apps/web/src/components/user-avatar.tsx
  function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
  const first = Array.from(parts[0] ?? "")[0] ?? "";
  const second = Array.from(parts[1] ?? "")[0] ?? "";
  return `${first}${second}`.toUpperCase();
  }
  return Array.from(source).slice(0, 2).join("").toUpperCase();
  }

Would you like me to generate the complete, drop-in replacement files for the Critical bugs (version-restore-listener.ts, notifications.ts, and editor-workspace.tsx) so you can apply them right away?
