import { authClient } from "./auth-client";

export const COLLAB_URL: string =
  import.meta.env.VITE_COLLAB_URL ?? "ws://localhost:1234";

export async function getCollabToken(): Promise<string> {
  const { data, error } = await authClient.token();
  if (error || !data?.token) {
    throw new Error(error?.message ?? "Could not get a collaboration token");
  }
  return data.token;
}