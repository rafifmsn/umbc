import { redis, isRedisAvailable } from "../redis";
import { db } from "../../db/client";
import { notifications } from "../../db/schema";
import {
  type NotificationEvent,
  type NotificationType,
  NOTIFICATION_STREAM_KEY,
  getUnreadCountCacheKey,
} from "./types";

/**
 * Enqueues a notification event into the Redis Stream, or falls back to direct PostgreSQL insertion.
 */
export async function enqueueNotification(
  event: NotificationEvent,
): Promise<string | null> {
  if (isRedisAvailable()) {
    try {
      const payload = JSON.stringify(event);
      const messageId = await redis.xadd(
        NOTIFICATION_STREAM_KEY,
        "*",
        "payload",
        payload,
      );

      // Optimistically increment in-memory unread cache
      try {
        await redis.incr(getUnreadCountCacheKey(event.recipientId));
      } catch {
        // Cache increment failure is non-fatal
      }

      return messageId;
    } catch (err) {
      console.warn(
        "[queue:producer] Failed to enqueue to Redis stream, falling back to direct DB write.",
        err,
      );
    }
  }

  // Graceful fallback: Direct PostgreSQL persistence
  try {
    const [inserted] = await db
      .insert(notifications)
      .values({
        type: event.type,
        recipientId: event.recipientId,
        senderId: event.senderId || null,
        title: event.title,
        message: event.message,
      })
      .returning({ id: notifications.id });

    return inserted?.id || null;
  } catch (dbErr) {
    console.error(
      "[queue:producer] Direct database fallback write failed:",
      dbErr,
    );
    throw dbErr;
  }
}

/**
 * Enqueues a batch of notification events (e.g. from an administrative campus broadcast).
 */
export async function enqueueNotificationBatch(
  events: NotificationEvent[],
): Promise<number> {
  if (events.length === 0) return 0;

  if (isRedisAvailable()) {
    try {
      const pipeline = redis.pipeline();
      for (const event of events) {
        pipeline.xadd(
          NOTIFICATION_STREAM_KEY,
          "*",
          "payload",
          JSON.stringify(event),
        );
        pipeline.incr(getUnreadCountCacheKey(event.recipientId));
      }
      const results = await pipeline.exec();
      return results?.length ? Math.floor(results.length / 2) : events.length;
    } catch (err) {
      console.warn(
        "[queue:producer] Batch enqueue failed, falling back to direct DB insert.",
        err,
      );
    }
  }

  // Graceful fallback: Direct bulk PostgreSQL insert
  try {
    const rows: Array<{
      type: NotificationType;
      recipientId: string;
      senderId: string | null;
      title: string;
      message: string;
    }> = events.map((e) => ({
      type: e.type,
      recipientId: e.recipientId,
      senderId: e.senderId || null,
      title: e.title,
      message: e.message,
    }));

    await db.insert(notifications).values(rows);
    return rows.length;
  } catch (dbErr) {
    console.error(
      "[queue:producer] Bulk database fallback insert failed:",
      dbErr,
    );
    throw dbErr;
  }
}
