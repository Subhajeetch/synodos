import { Redis } from "ioredis";
import { ACCESS_CHANNEL, type AccessChanged } from "@synodos/shared";
import { env } from "../env";

const publisher = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
publisher.on("error", (err) => console.error("[redis] publisher error:", err.message));

export async function publishAccessChanged(event: AccessChanged) {
  try {
    await publisher.publish(ACCESS_CHANNEL, JSON.stringify(event));
  } catch (err) {
    console.error("[redis] failed to publish access change:", err);
  }
}