import type { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";

export type SessionUser = typeof auth.$Infer.Session.user;

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser;
  }
}

export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session) return reply.code(401).send({ error: "Unauthorized" });
  request.user = session.user;
}
