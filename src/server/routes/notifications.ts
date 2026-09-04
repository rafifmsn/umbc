import { Hono } from "hono";
import { eq, and, sql as dSql } from "drizzle-orm";
import { db } from "../db/client";
import { notifications, users } from "../db/schema";
import { type HonoEnv, requireAuth } from "../lib/auth";

const router = new Hono<HonoEnv>();

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

  return c.json({
    data: notifs,
    unreadCount: unread?.count || 0,
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

  return c.json({ success: true });
});

router.patch("/read-all", requireAuth, async (c) => {
  const currentUser = c.get("user")!;

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.recipientId, currentUser.id));

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

  return c.json({ success: true });
});

router.delete("/", requireAuth, async (c) => {
  const currentUser = c.get("user")!;

  await db
    .delete(notifications)
    .where(eq(notifications.recipientId, currentUser.id));

  return c.json({ success: true });
});

router.post("/note", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const body = await c.req.json();
  const { recipientId, message } = body;

  if (!recipientId || !message?.trim()) {
    return c.json({ error: "Recipient and note message are required" }, 400);
  }

  const cleanMsg = message.trim().slice(0, 280);

  const [created] = await db
    .insert(notifications)
    .values({
      recipientId,
      senderId: currentUser.id,
      type: "NOTE",
      title: `Note from ${currentUser.name}`,
      message: cleanMsg,
    })
    .returning();

  return c.json({ success: true, notification: created }, 201);
});

export default router;
