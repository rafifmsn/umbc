import { redis, isRedisAvailable } from "../redis";
import { db } from "../../db/client";
import { notifications } from "../../db/schema";
import {
  type NotificationEvent,
  type NotificationType,
  NOTIFICATION_STREAM_KEY,
  NOTIFICATION_CONSUMER_GROUP,
  NOTIFICATION_CONSUMER_NAME,
} from "./types";

let isWorkerRunning = false;
let shouldStopWorker = false;

/**
 * Ensures the consumer group exists on the stream.
 */
async function initConsumerGroup(): Promise<void> {
  if (!isRedisAvailable()) return;

  try {
    // XGROUP CREATE stream:notifications notif_workers $ MKSTREAM
    await (redis as any).xgroup(
      "CREATE",
      NOTIFICATION_STREAM_KEY,
      NOTIFICATION_CONSUMER_GROUP,
      "$",
      "MKSTREAM",
    );
  } catch (err: any) {
    // BUSYGROUP Consumer Group name already exists is expected on restarts
    if (!err.message?.includes("BUSYGROUP")) {
      console.warn(
        "[queue:worker] Notice on consumer group setup:",
        err.message,
      );
    }
  }
}

/**
 * Processes a single batch of messages from the stream.
 */
export async function processNotificationBatch(): Promise<number> {
  if (!isRedisAvailable()) return 0;

  try {
    // Non-blocking XREADGROUP to preserve connection availability for API requests
    const response = await (redis as any).xreadgroup(
      "GROUP",
      NOTIFICATION_CONSUMER_GROUP,
      NOTIFICATION_CONSUMER_NAME,
      "COUNT",
      50,
      "STREAMS",
      NOTIFICATION_STREAM_KEY,
      ">",
    );

    if (!response || !Array.isArray(response) || response.length === 0) {
      return 0;
    }

    const [_streamKey, streamEntries] = response[0];
    if (!streamEntries || streamEntries.length === 0) {
      return 0;
    }

    const rowsToInsert: Array<{
      type: NotificationType;
      recipientId: string;
      senderId: string | null;
      title: string;
      message: string;
    }> = [];
    const messageIds: string[] = [];

    for (const entry of streamEntries) {
      const [id, fields] = entry;
      messageIds.push(id);

      // Find "payload" field in fields array: ["payload", "{...}"]
      for (let i = 0; i < fields.length; i += 2) {
        if (fields[i] === "payload") {
          try {
            const parsed = JSON.parse(fields[i + 1]) as NotificationEvent;
            rowsToInsert.push({
              type: parsed.type,
              recipientId: parsed.recipientId,
              senderId: parsed.senderId || null,
              title: parsed.title,
              message: parsed.message,
            });
          } catch (parseErr) {
            console.error(
              `[queue:worker] Failed to parse message ${id}:`,
              parseErr,
            );
          }
          break;
        }
      }
    }

    if (rowsToInsert.length > 0) {
      await db.insert(notifications).values(rowsToInsert);
    }

    // Acknowledge all processed messages
    if (messageIds.length > 0) {
      await (redis as any).xack(
        NOTIFICATION_STREAM_KEY,
        NOTIFICATION_CONSUMER_GROUP,
        ...messageIds,
      );
    }

    return rowsToInsert.length;
  } catch (err: any) {
    // If Redis connection drops during xreadgroup, handle quietly
    if (isRedisAvailable()) {
      console.warn(
        "[queue:worker] Error processing notification batch:",
        err.message,
      );
    }
    return 0;
  }
}

/**
 * Starts the continuous background consumer worker loop.
 */
export async function startNotificationWorker(): Promise<void> {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  shouldStopWorker = false;

  await initConsumerGroup();

  // Non-blocking background execution
  (async () => {
    while (!shouldStopWorker) {
      try {
        if (!isRedisAvailable()) {
          // If Redis is offline, wait gently before checking again
          await new Promise((resolve) => setTimeout(resolve, 3000));
          continue;
        }

        const count = await processNotificationBatch();
        if (count === 0) {
          // If queue is currently empty, sleep 1000ms before checking again
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (err) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    isWorkerRunning = false;
  })();
}

/**
 * Stops the background worker gracefully.
 */
export function stopNotificationWorker(): void {
  shouldStopWorker = true;
}
