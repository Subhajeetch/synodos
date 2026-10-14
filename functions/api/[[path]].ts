interface Env {
  BACKEND_URL?: string;
}

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
];

function getBackendOrigin(value: string | undefined): URL | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export async function onRequest({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const backendOrigin = getBackendOrigin(env.BACKEND_URL);
  if (!backendOrigin) {
    console.error("[api-proxy] BACKEND_URL must be a valid HTTP(S) origin.");
    return new Response("API proxy is not configured correctly.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const requestUrl = new URL(request.url);
  const targetUrl = new URL(
    `${requestUrl.pathname}${requestUrl.search}`,
    backendOrigin,
  );
  const headers = new Headers(request.headers);

  const connectionHeaders = headers.get("connection");
  if (connectionHeaders) {
    for (const header of connectionHeaders.split(",")) {
      headers.delete(header.trim());
    }
  }
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);

  headers.set("x-forwarded-host", requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.slice(0, -1));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstreamRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    ...(hasBody ? { body: request.body } : {}),
    redirect: "manual",
  });

  try {
    return await fetch(upstreamRequest);
  } catch (error) {
    console.error("[api-proxy] Backend request failed.", error);
    return new Response("API backend is unavailable.", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
