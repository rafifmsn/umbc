import type { MiddlewareHandler } from "hono";
import { redis, isRedisAvailable } from "../lib/redis";
import type { HonoEnv } from "../lib/auth";

export interface RateLimiterOptions {
  /** Maximum number of allowed requests in the time window */
  maxRequests: number;
  /** Duration of the sliding window in seconds */
  windowSeconds: number;
  /** Namespace prefix for Redis keys */
  prefix?: string;
  /** Custom key generator (defaults to userId or client IP) */
  keyGenerator?: (c: any) => string;
}

// Minimal in-memory fallback cache if Redis is offline
const memoryFallbackMap = new Map<string, { count: number; resetAt: number }>();

/**
 * High-performance token-bucket rate limiter middleware with Redis backend and in-memory fallback.
 */
export function rateLimiter(
  options: RateLimiterOptions,
): MiddlewareHandler<HonoEnv> {
  const { maxRequests, windowSeconds, prefix = "rl" } = options;

  return async (c, next) => {
    // Determine unique identifier: authenticated user ID or client IP
    const user = c.get("user");
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("cf-connecting-ip") ||
      "anonymous";
    const identifier = options.keyGenerator
      ? options.keyGenerator(c)
      : user?.id || ip;

    const key = `${prefix}:${identifier}`;

    if (isRedisAvailable()) {
      try {
        const pipeline = redis.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);
        const results = await pipeline.exec();

        if (results && results[0] && results[1]) {
          const [errIncr, current] = results[0] as [Error | null, number];
          const [errTtl, ttl] = results[1] as [Error | null, number];

          if (!errIncr && typeof current === "number") {
            // If this is the first request in the window, set expiry
            if (current === 1 || ttl === -1) {
              await redis.expire(key, windowSeconds);
            }

            c.header("X-RateLimit-Limit", maxRequests.toString());
            c.header(
              "X-RateLimit-Remaining",
              Math.max(0, maxRequests - current).toString(),
            );

            if (current > maxRequests) {
              c.header(
                "Retry-After",
                (ttl > 0 ? ttl : windowSeconds).toString(),
              );
              return c.json(
                {
                  error:
                    "Too many requests. Please slow down and try again later.",
                  retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
                },
                429,
              );
            }
          }
        }
      } catch {
        // Silent catch: Redis read failed, fall through to in-memory fallback
      }
    } else {
      // In-memory fallback
      const now = Date.now();
      const entry = memoryFallbackMap.get(key);

      if (!entry || now > entry.resetAt) {
        memoryFallbackMap.set(key, {
          count: 1,
          resetAt: now + windowSeconds * 1000,
        });
      } else {
        entry.count += 1;
        if (entry.count > maxRequests) {
          const remainingSec = Math.ceil((entry.resetAt - now) / 1000);
          c.header("Retry-After", remainingSec.toString());
          return c.json(
            {
              error: "Too many requests. Please slow down and try again later.",
              retryAfterSeconds: remainingSec,
            },
            429,
          );
        }
      }
    }

    return await next();
  };
}
