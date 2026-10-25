import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";
import { env } from "./env";
import { z } from "zod";
import { documentRoutes } from "./routes/documents";
import { notificationRoutes } from "./routes/notifications";
import { userRoutes } from "./routes/users";
import { versionRoutes } from "./routes/versions";

const app = Fastify({ logger: true, trustProxy: true });

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

const allowedOrigins = Array.from(
  new Set([env.WEB_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"]),
);

await app.register(cors, {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
});

app.setErrorHandler((err, request, reply) => {
  if (err instanceof z.ZodError) {
    return reply
      .code(400)
      .send({ error: "Invalid request", issues: err.issues });
  }
  request.log.error(err);
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  return reply.code(status).send({
    error: status >= 500 ? "Internal server error" : (err as Error).message,
  });
});

await app.register(documentRoutes, { prefix: "/api" });
await app.register(notificationRoutes, { prefix: "/api" });
await app.register(userRoutes, { prefix: "/api" });
await app.register(versionRoutes, { prefix: "/api" });

app.get("/health", async () => ({ status: "ok" }));

app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    const proto =
      (request.headers["x-forwarded-proto"] as string) ||
      request.protocol ||
      "http";
    const host =
      (request.headers["x-forwarded-host"] as string) || request.headers.host;
    const url = new URL(request.url, `${proto}://${host}`);
    const req = new Request(url, {
      method: request.method,
      headers: fromNodeHeaders(request.headers),
      ...(request.body ? { body: JSON.stringify(request.body) } : {}),
    });

    const res = await auth.handler(req);

    reply.status(res.status);
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
    });
    const cookies = res.headers.getSetCookie();
    if (cookies.length) reply.header("set-cookie", cookies);

    return reply.send(res.body ? await res.text() : null);
  },
});

app.get("/api/me", async (request, reply) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session) return reply.status(401).send({ error: "Unauthorized" });
  return session;
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
