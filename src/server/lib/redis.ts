import Redis, { type RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let isConnected = false;
let hasLoggedConnectionError = false;

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false, // Prevents commands from queuing and hanging if Redis is down
  connectTimeout: 2000,
  retryStrategy(times) {
    // Gentle exponential backoff, capped at 10s
    if (times > 10) {
      return null; // Stop retrying indefinitely if completely absent
    }
    return Math.min(times * 1000, 10000);
  },
  lazyConnect: true,
};

export const redis = new Redis(REDIS_URL, redisOptions);

// Catch and suppress continuous connection error spam
redis.on("error", (err: any) => {
  isConnected = false;
  if (!hasLoggedConnectionError) {
    console.warn(
      `[redis] Notice: Redis instance at '${REDIS_URL}' is currently unreachable. Operating in fallback mode (direct PostgreSQL persistence).`,
    );
    hasLoggedConnectionError = true;
  }
});

redis.on("connect", () => {
  isConnected = true;
  hasLoggedConnectionError = false;
  console.log(`[redis] Connected successfully to Redis at '${REDIS_URL}'.`);
});

redis.on("close", () => {
  isConnected = false;
});

/**
 * Initializes Redis connection asynchronously without blocking server boot.
 */
export async function initRedis(): Promise<boolean> {
  try {
    await redis.connect();
    isConnected = true;
    return true;
  } catch {
    isConnected = false;
    return false;
  }
}

/**
 * Checks whether Redis is actively connected and ready to receive commands.
 */
export function isRedisAvailable(): boolean {
  return isConnected && redis.status === "ready";
}

/**
 * Gracefully disconnects Redis on process shutdown.
 */
export async function closeRedis(): Promise<void> {
  if (isConnected || redis.status !== "end") {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
  }
}
