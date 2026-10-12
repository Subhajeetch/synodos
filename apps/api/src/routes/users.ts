import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { and, eq, ilike, ne, or, schema } from "@synodos/db";
import { requireUser } from "../lib/require-user";
import { db } from "../db";

const { user: users } = schema;

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

function hasControlCharacters(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Display name cannot be empty")
      .max(80, "Display name must be 80 characters or fewer")
      .refine((name) => !hasControlCharacters(name), {
        message: "Display name cannot contain control characters",
      }),
  })
  .strict();

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireUser);

  app.patch("/users/me", async (request, reply) => {
    const { name } = updateProfileSchema.parse(request.body);
    const [updatedUser] = await db
      .update(users)
      .set({ name })
      .where(eq(users.id, request.user.id))
      .returning({ name: users.name });

    if (!updatedUser) {
      return reply.code(404).send({ error: "User profile not found" });
    }

    return { name: updatedUser.name };
  });

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
