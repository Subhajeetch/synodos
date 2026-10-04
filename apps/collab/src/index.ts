import { Server } from "@hocuspocus/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { createDb, getDocumentRole } from "@synodos/db";
import { canEdit } from "@synodos/shared";

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    COLLAB_PORT: z.coerce.number().default(1234),
  })
  .parse(process.env);

const { db } = createDb(env.DATABASE_URL);
const JWKS = createRemoteJWKSet(new URL("/api/auth/jwks", env.BETTER_AUTH_URL));
const documentIdSchema = z.uuid();

const server = new Server({
  port: env.COLLAB_PORT,

  async onAuthenticate({ token, documentName, connectionConfig }) {
    if (!token) throw new Error("Unauthorized");
    if (!documentIdSchema.safeParse(documentName).success) {
      throw new Error("Invalid document");
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.BETTER_AUTH_URL,
      audience: env.BETTER_AUTH_URL,
    });
    const userId = payload.sub;
    if (!userId) throw new Error("Unauthorized");

    const role = await getDocumentRole(db, userId, documentName);
    if (!role) throw new Error("Forbidden");

    // viewers can read and see cursors, but their edits are ignored
    if (!canEdit(role)) connectionConfig.readOnly = true;

    return { userId, role };
  },
});

server.listen();