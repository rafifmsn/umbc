import { Hono } from "hono";
import { eq, and, sql as dSql } from "drizzle-orm";
import { db } from "../db/client";
import { notifications, users } from "../db/schema";
import { type HonoEnv, requireAuth } from "../lib/auth";
import { redis, isRedisAvailable } from "../lib/redis";
import { getUnreadCountCacheKey } from "../lib/queue/types";
import { enqueueNotification } from "../lib/queue/producer";
import { rateLimiter } from "../middleware/rate-limiter";

const router = new Hono<HonoEnv>();

/**
 * High-performance unread count endpoint.
 * Reads directly from Redis cache in O(1) time (< 1ms).
 * Falls back to PostgreSQL query if cache miss or Redis is unavailable.
 */
router.get("/unread-count", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const cacheKey = getUnreadCountCacheKey(currentUser.id);

  if (isRedisAvailable()) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return c.json({
          unreadCount: Math.max(0, parseInt(cached, 10) || 0),
          source: "cache",
        });
      }
    } catch {
      // Fall through to database on cache error
    }
  }

  // Database fallback
  const [unread] = await db
    .select({ count: dSql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, currentUser.id),
        eq(notifications.read, false),
      ),
    );

  const count = unread?.count || 0;

  // Repopulate cache
  if (isRedisAvailable()) {
    try {
      await redis.set(cacheKey, count.toString(), "EX", 3600);
    } catch {
      // Non-fatal
    }
  }

  return c.json({ unreadCount: count, source: "db" });
});

router.get("/", requireAuth, async (c) => {
  const currentUser = c.get("user")!;

  const notifs = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      read: notifications.read,
      createdAt: notifications.createdAt,
      sender: {
        id: users.id,
        name: users.name,
        nim: users.nim,
        avatarSeed: users.avatarSeed,
      },
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.senderId, users.id))
    .where(eq(notifications.recipientId, currentUser.id))
    .orderBy(dSql`${notifications.createdAt} desc`)
    .limit(30);

  const [unread] = await db
    .select({ count: dSql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, currentUser.id),
        eq(notifications.read, false),
      ),
    );

  const count = unread?.count || 0;

  // Sync cache with ground truth
  if (isRedisAvailable()) {
    try {
      await redis.set(
        getUnreadCountCacheKey(currentUser.id),
        count.toString(),
        "EX",
        3600,
      );
    } catch {
      // Non-fatal
    }
  }

  return c.json({
    data: notifs,
    unreadCount: count,
  });
});

router.patch("/:id/read", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const id = c.req.param("id");

  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientId, currentUser.id),
      ),
    );

  if (isRedisAvailable()) {
    try {
      const cacheKey = getUnreadCountCacheKey(currentUser.id);
      const val = await redis.decr(cacheKey);
      if (val < 0) {
        await redis.set(cacheKey, "0", "EX", 3600);
      }
    } catch {
      // Non-fatal
    }
  }

  return c.json({ success: true });
});

router.patch("/read-all", requireAuth, async (c) => {
  const currentUser = c.get("user")!;

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.recipientId, currentUser.id));

  if (isRedisAvailable()) {
    try {
      await redis.set(getUnreadCountCacheKey(currentUser.id), "0", "EX", 3600);
    } catch {
      // Non-fatal
    }
  }

  return c.json({ success: true });
});

router.delete("/:id", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const id = c.req.param("id");

  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientId, currentUser.id),
      ),
    );

  if (isRedisAvailable()) {
    try {
      await redis.del(getUnreadCountCacheKey(currentUser.id));
    } catch {
      // Non-fatal
    }
  }

  return c.json({ success: true });
});

router.delete("/", requireAuth, async (c) => {
  const currentUser = c.get("user")!;

  await db
    .delete(notifications)
    .where(eq(notifications.recipientId, currentUser.id));

  if (isRedisAvailable()) {
    try {
      await redis.set(getUnreadCountCacheKey(currentUser.id), "0", "EX", 3600);
    } catch {
      // Non-fatal
    }
  }

  return c.json({ success: true });
});

router.post(
  "/note",
  requireAuth,
  rateLimiter({ maxRequests: 10, windowSeconds: 60, prefix: "rl:note" }),
  async (c) => {
    const currentUser = c.get("user")!;
    const body = await c.req.json();
    const { recipientId, message } = body;

    if (!recipientId || !message?.trim()) {
      return c.json({ error: "Recipient and note message are required" }, 400);
    }

    const cleanMsg = message.trim().slice(0, 280);

    // Enqueue event via Redis Stream (or fallback directly to PostgreSQL)
    const eventId = await enqueueNotification({
      recipientId,
      senderId: currentUser.id,
      type: "NOTE",
      title: `Note from ${currentUser.name}`,
      message: cleanMsg,
    });

    return c.json({ success: true, eventId }, 201);
  },
);

export default router;
