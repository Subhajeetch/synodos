import Fastify from "fastify";
import cors from "@fastify/cors";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";
import { env } from "./env";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.WEB_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
});

app.get("/health", async () => ({ status: "ok" }));

app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    const url = new URL(request.url, `http://${request.headers.host}`);
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