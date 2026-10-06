import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { and, ilike, ne, or, schema } from "@synodos/db";
import { requireUser } from "../lib/require-user";
import { db } from "../db";

const { user: users } = schema;

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireUser);

  // Search users in workspace by name or email
  app.get("/users/search", async (request) => {
    const { q } = searchQuerySchema.parse(request.query);
    const pattern = `%${q}%`;

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(
        and(
          ne(users.id, request.user.id),
          or(ilike(users.name, pattern), ilike(users.email, pattern)),
        ),
      )
      .limit(10);

    return rows;
  });

  // List recent/suggested teammates for inviting
  app.get("/users", async (request) => {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(ne(users.id, request.user.id))
      .limit(20);

    return rows;
  });
};
