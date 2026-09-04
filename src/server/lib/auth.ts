import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users, sessions, type User } from "../db/schema";

export const SESSION_COOKIE_NAME = "umbc_session";
export const SESSION_EXPIRY_DAYS = 30;

export interface HonoEnv {
  Variables: {
    user: User | null;
    session: typeof sessions.$inferSelect | null;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      expiresAt,
    })
    .returning();

  return session.id;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export const authMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);

  if (!sessionId) {
    c.set("user", null);
    c.set("session", null);
    return await next();
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || new Date() > new Date(session.expiresAt)) {
    if (session) await deleteSession(session.id);
    deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
    c.set("user", null);
    c.set("session", null);
    return await next();
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  c.set("user", user || null);
  c.set("session", session);
  await next();
};

export const requireAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};

export const requireAdmin: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const user = c.get("user");
  if (!user || user.role !== "ADMIN") {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }
  await next();
};

export function setSessionCookie(c: any, sessionId: string) {
  const isProd = process.env.NODE_ENV === "production";
  setCookie(c, SESSION_COOKIE_NAME, sessionId, {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax",
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  });
}
