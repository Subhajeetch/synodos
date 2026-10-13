import { Redis } from "ioredis";
import { z } from "zod";
import {
  VERSION_CHECKPOINT_REQUEST_CHANNEL,
  VERSION_CHECKPOINT_RESULT_PREFIX,
  VERSION_RESTORE_REQUEST_CHANNEL,
  VERSION_RESTORE_RESULT_PREFIX,
  versionCheckpointResultSchema,
  versionRestoreResultSchema,
} from "@synodos/shared";
import { env } from "../env";

type RequestResult<T> =
  | { status: "timeout" }
  | { status: "response"; result: T };

async function requestCollaboration<T>(
  requestChannel: string,
  responsePrefix: string,
  request: { operationId: string },
  responseSchema: z.ZodType<T>,
): Promise<RequestResult<T>> {
  const publisher = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
  const subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
  const responseChannel = `${responsePrefix}${request.operationId}`;

  try {
    await subscriber.subscribe(responseChannel);
    return await new Promise<RequestResult<T>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscriber.off("message", onMessage);
        resolve({ status: "timeout" });
      }, 8_000);
      const onMessage = (channel: string, raw: string) => {
        if (channel !== responseChannel) return;
        const parsed = responseSchema.safeParse(safeJson(raw));
        if (
          !parsed.success ||
          typeof parsed.data !== "object" ||
          parsed.data === null ||
          !("operationId" in parsed.data) ||
          parsed.data.operationId !== request.operationId
        ) {
          return;
        }
        clearTimeout(timeout);
        subscriber.off("message", onMessage);
        resolve({ status: "response", result: parsed.data });
      };
      subscriber.on("message", onMessage);
      void publisher
        .publish(requestChannel, JSON.stringify(request))
        .catch((error: unknown) => {
          clearTimeout(timeout);
          subscriber.off("message", onMessage);
          reject(error);
        });
    });
  } finally {
    await Promise.all([publisher.quit(), subscriber.quit()]);
  }
}

export function requestLiveVersionRestore(input: {
  operationId: string;
  documentId: string;
  versionId: string;
  actorId: string;
}) {
  return requestCollaboration(
    VERSION_RESTORE_REQUEST_CHANNEL,
    VERSION_RESTORE_RESULT_PREFIX,
    input,
    versionRestoreResultSchema,
  );
}

export function requestLiveVersionCheckpoint(input: {
  operationId: string;
  documentId: string;
  actorId: string;
  label: string;
}) {
  return requestCollaboration(
    VERSION_CHECKPOINT_REQUEST_CHANNEL,
    VERSION_CHECKPOINT_RESULT_PREFIX,
    input,
    versionCheckpointResultSchema,
  );
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
