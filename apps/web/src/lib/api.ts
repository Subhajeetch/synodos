const API_URL: string =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:4000" : "");

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  json?: unknown;
};

export async function api<T>(
  path: string,
  { method = "GET", json }: Options = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers:
      json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;
    throw new ApiError(res.status, data?.error ?? res.statusText, data?.code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
