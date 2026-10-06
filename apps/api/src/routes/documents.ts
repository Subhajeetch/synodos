import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { and, desc, eq, getDocumentRole, schema, sql } from "@synodos/db";
import {
  addMemberSchema,
  canEdit,
  canManageMembers,
  createDocumentSchema,
  documentIdParamSchema,
  MAX_DOCUMENT_MEMBERS,
  updateDocumentSchema,
  type DocumentSummary,
} from "@synodos/shared";

import { db } from "../db";
import { requireUser } from "../lib/require-user";
import { publishAccessChanged } from "../lib/access-events";

const { documents, documentMembers, user: users } = schema;

const memberParamSchema = documentIdParamSchema.extend({ userId: z.string().min(1) });

export const documentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireUser);

  // list every document the user can access
  app.get("/documents", async (request): Promise<DocumentSummary[]> => {
    const rows = await db
      .select({
        id: documents.id,
        title: documents.title,
        role: documentMembers.role,
        updatedAt: documents.updatedAt,
      })
      .from(documentMembers)
      .innerJoin(documents, eq(documents.id, documentMembers.documentId))
      .where(eq(documentMembers.userId, request.user.id))
      .orderBy(desc(documents.updatedAt));

    return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
  });

  // Create a document; the creator becomes its owner
  app.post("/documents", async (request, reply) => {
    const body = createDocumentSchema.parse(request.body ?? {});

    const doc = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(documents)
        .values({ title: body.title, ownerId: request.user.id })
        .returning();
      if (!created) throw new Error("Failed to create document");
      await tx
        .insert(documentMembers)
        .values({ documentId: created.id, userId: request.user.id, role: "owner" });
      return created;
    });

    const summary: DocumentSummary = {
      id: doc.id,
      title: doc.title,
      role: "owner",
      updatedAt: doc.updatedAt.toISOString(),
    };
    return reply.code(201).send(summary);
  });

  app.get("/documents/:id", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });

    const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!doc) return reply.code(404).send({ error: "Not found" });

    const summary: DocumentSummary = {
      id: doc.id,
      title: doc.title,
      role,
      updatedAt: doc.updatedAt.toISOString(),
    };
    return summary;
  });

  app.patch("/documents/:id", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const body = updateDocumentSchema.parse(request.body);

    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });
    if (!canEdit(role)) return reply.code(403).send({ error: "Forbidden" });

    const [doc] = await db
      .update(documents)
      .set({ title: body.title, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    if (!doc) return reply.code(404).send({ error: "Not found" });

    const summary: DocumentSummary = {
      id: doc.id,
      title: doc.title,
      role,
      updatedAt: doc.updatedAt.toISOString(),
    };
    return summary;
  });

  // Only the owner can delete
  app.delete("/documents/:id", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });
    if (role !== "owner") return reply.code(403).send({ error: "Forbidden" });

    await db.delete(documents).where(eq(documents.id, id));
    await publishAccessChanged({ documentId: id, userId: null }); // kick everyone
    return reply.code(204).send();
  });

  app.get("/documents/:id/members", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });

    return db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: documentMembers.role,
      })
      .from(documentMembers)
      .innerJoin(users, eq(users.id, documentMembers.userId))
      .where(eq(documentMembers.documentId, id));
  });

  app.post("/documents/:id/members", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const body = addMemberSchema.parse(request.body);

    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });
    if (!canManageMembers(role)) return reply.code(403).send({ error: "Forbidden" });

    const [target] = await db
      .select({ id: users.id, name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (!target) return reply.code(404).send({ error: "No user with that email" });

    if ((await getDocumentRole(db, target.id, id)) === "owner") {
      return reply.code(400).send({ error: "Cannot change the owner's role" });
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select id from documents where id = ${id} for update`);

      const current = await tx
        .select({ userId: documentMembers.userId, role: documentMembers.role })
        .from(documentMembers)
        .where(eq(documentMembers.documentId, id));

      const existing = current.find((m) => m.userId === target.id);
      if (!existing && current.length >= MAX_DOCUMENT_MEMBERS) {
        return { status: "full" as const };
      }

      await tx
        .insert(documentMembers)
        .values({ documentId: id, userId: target.id, role: body.role })
        .onConflictDoUpdate({
          target: [documentMembers.documentId, documentMembers.userId],
          set: { role: body.role },
        });

      return {
        status: "ok" as const,
        roleChanged: existing !== undefined && existing.role !== body.role,
      };
    });

    if (result.status === "full") {
      return reply
        .code(409)
        .send({ error: `A document can have at most ${MAX_DOCUMENT_MEMBERS} members` });
    }

    // Publish event so any active socket or listening client updates immediately
    await publishAccessChanged({ documentId: id, userId: target.id });

    return reply.code(201).send({
      userId: target.id,
      name: target.name,
      email: target.email,
      image: target.image,
      role: body.role,
    });
  });

  // Update a member's role (e.g. editor <-> viewer)
  app.patch("/documents/:id/members/:userId", async (request, reply) => {
    const { id, userId } = memberParamSchema.parse(request.params);
    const body = z.object({ role: z.enum(["editor", "viewer"]) }).parse(request.body);

    const callerRole = await getDocumentRole(db, request.user.id, id);
    if (!callerRole) return reply.code(404).send({ error: "Not found" });
    if (!canManageMembers(callerRole)) return reply.code(403).send({ error: "Forbidden" });

    const targetRole = await getDocumentRole(db, userId, id);
    if (!targetRole) return reply.code(404).send({ error: "Member not found" });
    if (targetRole === "owner") {
      return reply.code(400).send({ error: "Cannot change the owner's role" });
    }

    await db
      .update(documentMembers)
      .set({ role: body.role })
      .where(and(eq(documentMembers.documentId, id), eq(documentMembers.userId, userId)));

    await publishAccessChanged({ documentId: id, userId });

    return reply.send({ userId, role: body.role });
  });

  app.delete("/documents/:id/members/:userId", async (request, reply) => {
    const { id, userId } = memberParamSchema.parse(request.params);

    const role = await getDocumentRole(db, request.user.id, id);
    if (!role) return reply.code(404).send({ error: "Not found" });
    if (!canManageMembers(role)) return reply.code(403).send({ error: "Forbidden" });

    if ((await getDocumentRole(db, userId, id)) === "owner") {
      return reply.code(400).send({ error: "Cannot remove the owner" });
    }

    await db
      .delete(documentMembers)
      .where(and(eq(documentMembers.documentId, id), eq(documentMembers.userId, userId)));

    await publishAccessChanged({ documentId: id, userId });
    return reply.code(204).send();
  });
};