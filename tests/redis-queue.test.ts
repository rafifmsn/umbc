/// <reference types="bun-types" />
import { describe, it, expect, afterAll } from "bun:test";
import { app } from "../src/server/index";
import { sql, db } from "../src/server/db/client";
import { users, sessions, notifications } from "../src/server/db/schema";
import { eq } from "drizzle-orm";
import {
  enqueueNotification,
  enqueueNotificationBatch,
} from "../src/server/lib/queue/producer";
import { closeRedis, isRedisAvailable } from "../src/server/lib/redis";
import { stopNotificationWorker } from "../src/server/lib/queue/worker";

describe("Redis Streams & Queue Subsystem Suite", () => {
  const testNim = "88888888888";
  let authCookie = "";
  let testUserId = "";

  afterAll(async () => {
    stopNotificationWorker();
    await closeRedis();

    // Clean up test records
    try {
      if (testUserId) {
        await db
          .delete(notifications)
          .where(eq(notifications.recipientId, testUserId));
        await db.delete(sessions).where(eq(sessions.userId, testUserId));
        await db.delete(users).where(eq(users.id, testUserId));
      }
    } catch (e) {
      console.warn("Cleanup warning in redis-queue test:", e);
    }
  });

  it("Health endpoint reports Redis status gracefully", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      runtime: string;
      redis: string;
    };
    expect(body.status).toBe("healthy");
    expect(body.runtime).toBe("bun");
    expect(["connected", "fallback_mode"]).toContain(body.redis);
  });

  it("Registers a test user for notification tests", async () => {
    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Queue Test User",
        nim: testNim,
        password: "securePassword123!",
        campus: "UMB_MY",
        faculty: "FIK",
        major: "Teknik Informatika",
        shift: "Reguler 1",
        semester: 2,
        disclaimerAccepted: true,
      }),
    });

    expect(res.status).toBe(201);
    const cookieHeader = res.headers.get("set-cookie");
    if (cookieHeader) {
      authCookie = cookieHeader.split(";")[0];
    }
    const body = (await res.json()) as { user: { id: string } };
    testUserId = body.user.id;
    expect(testUserId).toBeDefined();
  });

  it("GET /api/notifications/unread-count returns 0 for a new user", async () => {
    const res = await app.request("/api/notifications/unread-count", {
      headers: { Cookie: authCookie },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { unreadCount: number; source: string };
    expect(body.unreadCount).toBe(0);
    expect(["cache", "db"]).toContain(body.source);
  });

  it("Enqueues and stores a notification event successfully", async () => {
    const eventId = await enqueueNotification({
      type: "NOTE",
      recipientId: testUserId,
      title: "Automated Stream Test",
      message: "Testing decoupled event pipeline and cache increment.",
    });

    expect(eventId).toBeDefined();

    // Verify unread count reflects the new notification
    const res = await app.request("/api/notifications/unread-count", {
      headers: { Cookie: authCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { unreadCount: number };
    expect(body.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it("Enqueues a batch of notifications successfully", async () => {
    const count = await enqueueNotificationBatch([
      {
        type: "SYSTEM_BROADCAST",
        recipientId: testUserId,
        title: "Broadcast 1",
        message: "Batch item 1",
      },
      {
        type: "SYSTEM_BROADCAST",
        recipientId: testUserId,
        title: "Broadcast 2",
        message: "Batch item 2",
      },
    ]);

    expect(count).toBe(2);
  });

  it("Rate limits /api/notifications/note when burst threshold is exceeded", async () => {
    let lastStatus = 200;

    // Send 12 rapid note requests (threshold is 10 requests / 60 seconds)
    for (let i = 0; i < 12; i++) {
      const res = await app.request("/api/notifications/note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          recipientId: testUserId,
          message: `Rapid message #${i}`,
        }),
      });

      if (res.status === 429) {
        lastStatus = 429;
        const errBody = (await res.json()) as { error: string };
        expect(errBody.error).toContain("Too many requests");
        break;
      }
    }

    expect(lastStatus).toBe(429);
  });
});
