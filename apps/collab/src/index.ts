import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Redis } from "@hocuspocus/extension-redis";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import {
  createDb,
  documents,
  eq,
  getDocumentRole,
  loadDocumentState,
  saveDocumentState,
} from "@synodos/db";
import { canEdit } from "@synodos/shared";
import { redisConfigFromUrl } from "./redis-config";
import { listenForAccessChanges } from "./access-listener";

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    COLLAB_PORT: z.coerce.number().default(1234),
  })
  .parse(process.env);

const { db } = createDb(env.DATABASE_URL);
const JWKS = createRemoteJWKSet(new URL("/api/auth/jwks", env.BETTER_AUTH_URL));

const server = new Server({
  name: `synodos-collab-${env.COLLAB_PORT}`,
  port: env.COLLAB_PORT,
  debounce: 2_000, // store 2s after the last change...
  maxDebounce: 10_000, // ...but never wait longer than 10s during continuous typing

  extensions: [

    new Redis({ ...redisConfigFromUrl(env.REDIS_URL), prefix: "synodos" }),

    new Database({
      fetch: async ({ documentName }) => loadDocumentState(db, documentName),

      store: async ({ documentName, state }) => {

        const touched = await db
          .update(documents)
          .set({ updatedAt: new Date() })
          .where(eq(documents.id, documentName))
          .returning({ id: documents.id });
        if (touched.length === 0) return;

        await saveDocumentState(db, documentName, state);
      },
    }),
  ],

  async onAuthenticate({ token, documentName, connectionConfig }) {
    if (!token) throw new Error("Unauthorized");
    if (!z.uuid().safeParse(documentName).success) {
      throw new Error("Invalid document");
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: env.BETTER_AUTH_URL,
        audience: env.BETTER_AUTH_URL,
      });
      if (!payload.sub) throw new Error("Missing subject");
      userId = payload.sub;
    } catch {
      throw new Error("Unauthorized");
    }

    const role = await getDocumentRole(db, userId, documentName);
    if (!role) throw new Error("Forbidden");

    if (!canEdit(role)) connectionConfig.readOnly = true;

    return { userId, role };
  },
});

await server.listen();

const stopListening = listenForAccessChanges(server.hocuspocus, env.REDIS_URL);

async function shutdown(signal: string) {
  console.log(`${signal} received, flushing pending stores…`);
  await stopListening();
  server.hocuspocus.flushPendingStores();
  await server.destroy();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));