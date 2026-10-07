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

const {
  documents,
  documentInvitations,
  documentJoinRequests,
  documentMembers,
  user: users,
} = schema;

const memberParamSchema = documentIdParamSchema.extend({
  userId: z.string().min(1),
});

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
        .values({
          documentId: created.id,
          userId: request.user.id,
          role: "owner",
        });
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

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);
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

  app.get("/documents/:id/access-status", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);
    if (!doc)
      return reply
        .code(404)
        .send({ error: "Document not found", code: "DOCUMENT_NOT_FOUND" });

    const role = await getDocumentRole(db, request.user.id, id);
    if (role) return { status: "none" as const };

    const [invitation] = await db
      .select({ id: documentInvitations.id })
      .from(documentInvitations)
      .where(
        and(
          eq(documentInvitations.documentId, id),
          eq(documentInvitations.userId, request.user.id),
        ),
      )
      .limit(1);
    if (invitation) return { status: "invited" as const };

    const [joinRequest] = await db
      .select({ status: documentJoinRequests.status })
      .from(documentJoinRequests)
      .where(
        and(
          eq(documentJoinRequests.documentId, id),
          eq(documentJoinRequests.userId, request.user.id),
        ),
      )
      .limit(1);

    return {
      status:
        joinRequest?.status === "pending"
          ? ("requested" as const)
          : joinRequest?.status === "rejected"
            ? ("rejected" as const)
            : ("none" as const),
    };
  });

  app.get("/documents/:id/sharing", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const role = await getDocumentRole(db, request.user.id, id);
    if (!role)
      return reply
        .code(404)
        .send({ error: "Not found", code: "DOCUMENT_NOT_FOUND" });
    if (!canManageMembers(role)) {
      return reply
        .code(403)
        .send({
          error: "Only the document owner can manage sharing",
          code: "OWNER_REQUIRED",
        });
    }

    const [invitations, requests] = await Promise.all([
      db
        .select({
          id: documentInvitations.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          role: documentInvitations.role,
          createdAt: documentInvitations.createdAt,
        })
        .from(documentInvitations)
        .innerJoin(users, eq(users.id, documentInvitations.userId))
        .where(eq(documentInvitations.documentId, id)),
      db
        .select({
          id: documentJoinRequests.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          createdAt: documentJoinRequests.createdAt,
        })
        .from(documentJoinRequests)
        .innerJoin(users, eq(users.id, documentJoinRequests.userId))
        .where(
          and(
            eq(documentJoinRequests.documentId, id),
            eq(documentJoinRequests.status, "pending"),
          ),
        ),
    ]);

    return {
      invitations: invitations.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      requests: requests.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  });

  app.post("/documents/:id/join-requests", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);
    if (!doc)
      return reply
        .code(404)
        .send({ error: "Document not found", code: "DOCUMENT_NOT_FOUND" });

    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from documents where id = ${id} for update`,
      );

      const [membership] = await tx
        .select({ userId: documentMembers.userId })
        .from(documentMembers)
        .where(
          and(
            eq(documentMembers.documentId, id),
            eq(documentMembers.userId, request.user.id),
          ),
        )
        .limit(1);
      if (membership) return { status: "member" as const };

      const [invitation] = await tx
        .select({ id: documentInvitations.id })
        .from(documentInvitations)
        .where(
          and(
            eq(documentInvitations.documentId, id),
            eq(documentInvitations.userId, request.user.id),
          ),
        )
        .limit(1);
      if (invitation) return { status: "invited" as const };

      const [previousRequest] = await tx
        .select({ status: documentJoinRequests.status })
        .from(documentJoinRequests)
        .where(
          and(
            eq(documentJoinRequests.documentId, id),
            eq(documentJoinRequests.userId, request.user.id),
          ),
        )
        .limit(1);
      if (previousRequest) {
        return {
          status:
            previousRequest.status === "pending"
              ? ("already-requested" as const)
              : ("already-decided" as const),
        };
      }

      const [memberRows, invitationRows, requestRows] = await Promise.all([
        tx
          .select({ userId: documentMembers.userId })
          .from(documentMembers)
          .where(eq(documentMembers.documentId, id)),
        tx
          .select({ userId: documentInvitations.userId })
          .from(documentInvitations)
          .where(eq(documentInvitations.documentId, id)),
        tx
          .select({ userId: documentJoinRequests.userId })
          .from(documentJoinRequests)
          .where(
            and(
              eq(documentJoinRequests.documentId, id),
              eq(documentJoinRequests.status, "pending"),
            ),
          ),
      ]);
      const reserved = new Set([
        ...memberRows.map((item) => item.userId),
        ...invitationRows.map((item) => item.userId),
        ...requestRows.map((item) => item.userId),
      ]);
      if (reserved.size >= MAX_DOCUMENT_MEMBERS)
        return { status: "full" as const };

      await tx.insert(documentJoinRequests).values({
        documentId: id,
        userId: request.user.id,
      });
      return { status: "created" as const };
    });

    if (result.status === "member") {
      return reply
        .code(409)
        .send({
          error: "You already have access to this document",
          code: "ALREADY_A_MEMBER",
        });
    }
    if (result.status === "invited") {
      return reply
        .code(409)
        .send({
          error: "You already have a pending invitation. Accept it to join.",
          code: "INVITATION_PENDING",
        });
    }
    if (result.status === "already-requested") {
      return reply
        .code(409)
        .send({
          error: "Your request is already waiting for the owner",
          code: "REQUEST_ALREADY_PENDING",
        });
    }
    if (result.status === "already-decided") {
      return reply
        .code(409)
        .send({
          error: "The owner has already reviewed your request",
          code: "REQUEST_ALREADY_REVIEWED",
        });
    }
    if (result.status === "full") {
      return reply
        .code(409)
        .send({
          error: `This document has reached its ${MAX_DOCUMENT_MEMBERS}-person capacity`,
          code: "MEMBER_LIMIT_REACHED",
        });
    }

    return reply.code(201).send({ status: "requested" });
  });

  app.post("/documents/:id/invitations", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const body = addMemberSchema.parse(request.body);
    const role = await getDocumentRole(db, request.user.id, id);
    if (!role)
      return reply
        .code(404)
        .send({ error: "Not found", code: "DOCUMENT_NOT_FOUND" });
    if (!canManageMembers(role)) {
      return reply
        .code(403)
        .send({
          error: "Only the document owner can invite collaborators",
          code: "OWNER_REQUIRED",
        });
    }

    const [target] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (!target) {
      return reply
        .code(404)
        .send({
          error: "No account exists with that email address",
          code: "USER_NOT_FOUND",
        });
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from documents where id = ${id} for update`,
      );

      const [membership] = await tx
        .select({ userId: documentMembers.userId })
        .from(documentMembers)
        .where(
          and(
            eq(documentMembers.documentId, id),
            eq(documentMembers.userId, target.id),
          ),
        )
        .limit(1);
      if (membership) return { status: "member" as const };

      const [existingInvitation] = await tx
        .select({ id: documentInvitations.id })
        .from(documentInvitations)
        .where(
          and(
            eq(documentInvitations.documentId, id),
            eq(documentInvitations.userId, target.id),
          ),
        )
        .limit(1);

      const [memberRows, invitationRows, requestRows] = await Promise.all([
        tx
          .select({ userId: documentMembers.userId })
          .from(documentMembers)
          .where(eq(documentMembers.documentId, id)),
        tx
          .select({ userId: documentInvitations.userId })
          .from(documentInvitations)
          .where(eq(documentInvitations.documentId, id)),
        tx
          .select({ userId: documentJoinRequests.userId })
          .from(documentJoinRequests)
          .where(
            and(
              eq(documentJoinRequests.documentId, id),
              eq(documentJoinRequests.status, "pending"),
            ),
          ),
      ]);
      const reserved = new Set([
        ...memberRows.map((item) => item.userId),
        ...invitationRows.map((item) => item.userId),
        ...requestRows.map((item) => item.userId),
      ]);
      if (
        !existingInvitation &&
        !reserved.has(target.id) &&
        reserved.size >= MAX_DOCUMENT_MEMBERS
      ) {
        return { status: "full" as const };
      }

      await tx
        .delete(documentJoinRequests)
        .where(
          and(
            eq(documentJoinRequests.documentId, id),
            eq(documentJoinRequests.userId, target.id),
            eq(documentJoinRequests.status, "pending"),
          ),
        );
      const [invitation] = await tx
        .insert(documentInvitations)
        .values({
          documentId: id,
          userId: target.id,
          role: body.role,
          invitedBy: request.user.id,
        })
        .onConflictDoUpdate({
          target: [documentInvitations.documentId, documentInvitations.userId],
          set: { role: body.role, invitedBy: request.user.id },
        })
        .returning({
          id: documentInvitations.id,
          createdAt: documentInvitations.createdAt,
        });

      if (!invitation) throw new Error("Failed to create document invitation");
      return { status: "invited" as const, invitation };
    });

    if (result.status === "member") {
      return reply
        .code(409)
        .send({
          error: "This person already has access to the document",
          code: "ALREADY_A_MEMBER",
        });
    }
    if (result.status === "full") {
      return reply
        .code(409)
        .send({
          error: `This document has reached its ${MAX_DOCUMENT_MEMBERS}-person capacity`,
          code: "MEMBER_LIMIT_REACHED",
        });
    }

    return reply.code(201).send({
      id: result.invitation.id,
      userId: target.id,
      name: target.name,
      email: target.email,
      image: target.image,
      role: body.role,
      createdAt: result.invitation.createdAt.toISOString(),
    });
  });

  app.post("/documents/:id/invitations/accept", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from documents where id = ${id} for update`,
      );
      const [invitation] = await tx
        .select({ role: documentInvitations.role })
        .from(documentInvitations)
        .where(
          and(
            eq(documentInvitations.documentId, id),
            eq(documentInvitations.userId, request.user.id),
          ),
        )
        .limit(1);
      if (!invitation) {
        const [member] = await tx
          .select({
            role: documentMembers.role,
            userId: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          })
          .from(documentMembers)
          .innerJoin(users, eq(users.id, documentMembers.userId))
          .where(
            and(
              eq(documentMembers.documentId, id),
              eq(documentMembers.userId, request.user.id),
            ),
          )
          .limit(1);
        return member
          ? { status: "member" as const, member }
          : { status: "missing" as const };
      }

      const [member] = await tx
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, request.user.id))
        .limit(1);
      if (!member) return { status: "missing" as const };

      await tx.insert(documentMembers).values({
        documentId: id,
        userId: request.user.id,
        role: invitation.role,
      });
      await tx
        .delete(documentInvitations)
        .where(
          and(
            eq(documentInvitations.documentId, id),
            eq(documentInvitations.userId, request.user.id),
          ),
        );
      await tx
        .delete(documentJoinRequests)
        .where(
          and(
            eq(documentJoinRequests.documentId, id),
            eq(documentJoinRequests.userId, request.user.id),
          ),
        );
      return {
        status: "accepted" as const,
        member: { ...member, role: invitation.role },
      };
    });

    if (result.status === "missing") {
      return reply
        .code(404)
        .send({
          error: "No pending invitation was found",
          code: "INVITATION_NOT_FOUND",
        });
    }
    if (result.status === "accepted") {
      await publishAccessChanged({ documentId: id, userId: request.user.id });
      return { status: "accepted", member: result.member };
    }
    return { status: "already-member", member: result.member };
  });

  app.delete(
    "/documents/:id/invitations/:invitationId",
    async (request, reply) => {
      const { id } = documentIdParamSchema.parse(request.params);
      const { invitationId } = z
        .object({ invitationId: z.uuid() })
        .parse(request.params);
      const role = await getDocumentRole(db, request.user.id, id);
      if (!role)
        return reply
          .code(404)
          .send({ error: "Not found", code: "DOCUMENT_NOT_FOUND" });
      if (!canManageMembers(role)) {
        return reply
          .code(403)
          .send({
            error: "Only the document owner can revoke invitations",
            code: "OWNER_REQUIRED",
          });
      }
      const [deleted] = await db
        .delete(documentInvitations)
        .where(
          and(
            eq(documentInvitations.id, invitationId),
            eq(documentInvitations.documentId, id),
          ),
        )
        .returning({ id: documentInvitations.id });
      if (!deleted) {
        return reply
          .code(404)
          .send({
            error: "Pending invitation not found",
            code: "INVITATION_NOT_FOUND",
          });
      }
      return reply.code(204).send();
    },
  );

  app.post(
    "/documents/:id/join-requests/:requestId/approve",
    async (request, reply) => {
      const { id } = documentIdParamSchema.parse(request.params);
      const { requestId } = z
        .object({ requestId: z.uuid() })
        .parse(request.params);
      const role = await getDocumentRole(db, request.user.id, id);
      if (!role)
        return reply
          .code(404)
          .send({ error: "Not found", code: "DOCUMENT_NOT_FOUND" });
      if (!canManageMembers(role)) {
        return reply
          .code(403)
          .send({
            error: "Only the document owner can review join requests",
            code: "OWNER_REQUIRED",
          });
      }

      const result = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select id from documents where id = ${id} for update`,
        );
        const [joinRequest] = await tx
          .select({ userId: documentJoinRequests.userId })
          .from(documentJoinRequests)
          .where(
            and(
              eq(documentJoinRequests.id, requestId),
              eq(documentJoinRequests.documentId, id),
              eq(documentJoinRequests.status, "pending"),
            ),
          )
          .limit(1);
        if (!joinRequest) return { status: "missing" as const };

        const [member] = await tx
          .select({
            userId: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          })
          .from(users)
          .where(eq(users.id, joinRequest.userId))
          .limit(1);
        if (!member) return { status: "missing" as const };

        await tx.insert(documentMembers).values({
          documentId: id,
          userId: member.userId,
          role: "editor",
        });
        await tx
          .delete(documentJoinRequests)
          .where(eq(documentJoinRequests.id, requestId));
        return { status: "approved" as const, member };
      });

      if (result.status === "missing") {
        return reply
          .code(404)
          .send({
            error: "Pending join request not found",
            code: "REQUEST_NOT_FOUND",
          });
      }
      await publishAccessChanged({
        documentId: id,
        userId: result.member.userId,
      });
      return reply
        .code(201)
        .send({ ...result.member, role: "editor" as const });
    },
  );

  app.delete(
    "/documents/:id/join-requests/:requestId",
    async (request, reply) => {
      const { id } = documentIdParamSchema.parse(request.params);
      const { requestId } = z
        .object({ requestId: z.uuid() })
        .parse(request.params);
      const role = await getDocumentRole(db, request.user.id, id);
      if (!role)
        return reply
          .code(404)
          .send({ error: "Not found", code: "DOCUMENT_NOT_FOUND" });
      if (!canManageMembers(role)) {
        return reply
          .code(403)
          .send({
            error: "Only the document owner can review join requests",
            code: "OWNER_REQUIRED",
          });
      }
      const [rejected] = await db
        .update(documentJoinRequests)
        .set({ status: "rejected" })
        .where(
          and(
            eq(documentJoinRequests.id, requestId),
            eq(documentJoinRequests.documentId, id),
            eq(documentJoinRequests.status, "pending"),
          ),
        )
        .returning({ id: documentJoinRequests.id });
      if (!rejected) {
        return reply
          .code(404)
          .send({
            error: "Pending join request not found",
            code: "REQUEST_NOT_FOUND",
          });
      }
      return reply.code(204).send();
    },
  );

  app.post("/documents/:id/members", async (request, reply) => {
    const { id } = documentIdParamSchema.parse(request.params);
    const body = addMemberSchema.parse(request.body);

    const role = await getDocumentRole(db, request.user.id, id);
    if (!role)
      return reply
        .code(404)
        .send({ error: "Not found", code: "DOCUMENT_NOT_FOUND" });
    if (!canManageMembers(role)) {
      return reply
        .code(403)
        .send({
          error: "Only the document owner can manage members",
          code: "OWNER_REQUIRED",
        });
    }

    const [target] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (!target) {
      return reply
        .code(404)
        .send({
          error: "No account exists with that email address",
          code: "USER_NOT_FOUND",
        });
    }

    if ((await getDocumentRole(db, target.id, id)) === "owner") {
      return reply
        .code(409)
        .send({
          error: "Cannot change the owner's role",
          code: "OWNER_ROLE_IMMUTABLE",
        });
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from documents where id = ${id} for update`,
      );

      const [current, invitations, requests] = await Promise.all([
        tx
          .select({
            userId: documentMembers.userId,
            role: documentMembers.role,
          })
          .from(documentMembers)
          .where(eq(documentMembers.documentId, id)),
        tx
          .select({ userId: documentInvitations.userId })
          .from(documentInvitations)
          .where(eq(documentInvitations.documentId, id)),
        tx
          .select({ userId: documentJoinRequests.userId })
          .from(documentJoinRequests)
          .where(
            and(
              eq(documentJoinRequests.documentId, id),
              eq(documentJoinRequests.status, "pending"),
            ),
          ),
      ]);

      const existing = current.find((member) => member.userId === target.id);
      const reserved = new Set([
        ...current.map((member) => member.userId),
        ...invitations.map((invitation) => invitation.userId),
        ...requests.map((joinRequest) => joinRequest.userId),
      ]);
      if (
        !existing &&
        !reserved.has(target.id) &&
        reserved.size >= MAX_DOCUMENT_MEMBERS
      ) {
        return { status: "full" as const };
      }

      await tx
        .delete(documentInvitations)
        .where(
          and(
            eq(documentInvitations.documentId, id),
            eq(documentInvitations.userId, target.id),
          ),
        );
      await tx
        .delete(documentJoinRequests)
        .where(
          and(
            eq(documentJoinRequests.documentId, id),
            eq(documentJoinRequests.userId, target.id),
          ),
        );
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
      return reply.code(409).send({
        error: `This document has reached its ${MAX_DOCUMENT_MEMBERS}-person capacity`,
        code: "MEMBER_LIMIT_REACHED",
      });
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
    const body = z
      .object({ role: z.enum(["editor", "viewer"]) })
      .parse(request.body);

    const callerRole = await getDocumentRole(db, request.user.id, id);
    if (!callerRole) return reply.code(404).send({ error: "Not found" });
    if (!canManageMembers(callerRole))
      return reply.code(403).send({ error: "Forbidden" });

    const targetRole = await getDocumentRole(db, userId, id);
    if (!targetRole) return reply.code(404).send({ error: "Member not found" });
    if (targetRole === "owner") {
      return reply.code(400).send({ error: "Cannot change the owner's role" });
    }

    await db
      .update(documentMembers)
      .set({ role: body.role })
      .where(
        and(
          eq(documentMembers.documentId, id),
          eq(documentMembers.userId, userId),
        ),
      );

    await publishAccessChanged({ documentId: id, userId });

    return reply.send({ userId, role: body.role });
  });

  app.delete("/documents/:id/members/:userId", async (request, reply) => {
    const { id, userId } = memberParamSchema.parse(request.params);

    const role = await getDocumentRole(db, request.user.id, id);
    if (!role)
      return reply
        .code(404)
        .send({ error: "Not found", code: "DOCUMENT_NOT_FOUND" });
    if (!canManageMembers(role)) {
      return reply
        .code(403)
        .send({
          error: "Only the document owner can manage members",
          code: "OWNER_REQUIRED",
        });
    }

    if ((await getDocumentRole(db, userId, id)) === "owner") {
      return reply
        .code(409)
        .send({
          error: "Cannot remove the owner",
          code: "OWNER_CANNOT_BE_REMOVED",
        });
    }

    const [deleted] = await db
      .delete(documentMembers)
      .where(
        and(
          eq(documentMembers.documentId, id),
          eq(documentMembers.userId, userId),
        ),
      )
      .returning({ userId: documentMembers.userId });
    if (!deleted) {
      return reply
        .code(404)
        .send({ error: "Document member not found", code: "MEMBER_NOT_FOUND" });
    }

    await publishAccessChanged({ documentId: id, userId });
    return reply.code(204).send();
  });
};
