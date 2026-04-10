import { createClient } from "redis";
import { logger } from "./logger";

let _client: ReturnType<typeof createClient> | null = null;

function getRedisClient() {
  if (!_client) {
    _client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });
    _client.on("error", (err) => logger.error({ err }, "Redis client error"));
    _client.connect();
  }
  return _client;
}

// TTL slightly above your sendCommand timeout — acts as a backstop
// if the ECS task is killed mid-processing and finally() never runs.
const LOCK_TTL_MS = 30_000;

export async function acquireLock(key: string): Promise<boolean> {
  const client = getRedisClient();
  const result = await client.set(key, "1", {
    NX: true,
    PX: LOCK_TTL_MS,
  });
  return result === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(key).catch(() => {});
}
