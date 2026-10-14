import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    import.meta.env.VITE_API_URL ??
    (import.meta.env.DEV ? "http://localhost:4000" : window.location.origin),
  fetchOptions: { credentials: "include" },
  plugins: [jwtClient()],
});