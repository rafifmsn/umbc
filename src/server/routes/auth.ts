import { Hono } from "hono";
import { eq, or } from "drizzle-orm";
import { db } from "../db/client";
import { users, type NewUser } from "../db/schema";
import {
  type HonoEnv,
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  setSessionCookie,
  SESSION_COOKIE_NAME,
} from "../lib/auth";
import { deleteCookie } from "hono/cookie";

const auth = new Hono<HonoEnv>();

const NIM_REGEX = /^\d{11,12}$/;

auth.post("/register", async (c) => {
  const body = await c.req.json();
  const {
    name,
    nim,
    password,
    campus,
    faculty,
    major,
    degree = "S1",
    shift,
    semester = 1,
    avatarSeed,
    disclaimerAccepted,
  } = body;

  if (!name || !nim || !password || !campus || !faculty || !major || !shift) {
    return c.json({ error: "Missing required registration fields" }, 400);
  }

  const cleanNim = nim.trim();
  if (!NIM_REGEX.test(cleanNim)) {
    return c.json(
      { error: "Invalid NIM format. Must be 11 to 12 numeric digits." },
      400,
    );
  }

  if (password.length < 6) {
    return c.json(
      { error: "Password must be at least 6 characters long" },
      400,
    );
  }

  if (!disclaimerAccepted) {
    return c.json(
      { error: "You must accept the anti-impersonation policy to register" },
      400,
    );
  }

  const derivedEmail = `${cleanNim}@student.mercubuana.ac.id`.toLowerCase();

  const [existing] = await db
    .select()
    .from(users)
    .where(or(eq(users.nim, cleanNim), eq(users.email, derivedEmail)))
    .limit(1);

  if (existing) {
    return c.json(
      { error: "Account with this NIM or email is already registered" },
      409,
    );
  }

  const passwordHash = await hashPassword(password);

  const newUser: NewUser = {
    name: name.trim(),
    nim: cleanNim,
    email: derivedEmail,
    passwordHash,
    campus,
    faculty,
    major,
    degree,
    shift,
    semester: Number(semester) || 1,
    semesterUpdatedAt: new Date(),
    avatarSeed: avatarSeed || cleanNim,
    disclaimerAccepted: true,
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();
  const sessionId = await createSession(createdUser.id);
  setSessionCookie(c, sessionId);

  const { passwordHash: _, ...safeUser } = createdUser;
  return c.json({ user: safeUser }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const { nim, password } = body;

  if (!nim || !password) {
    return c.json({ error: "NIM and password are required" }, 400);
  }

  const cleanNim = nim.trim();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.nim, cleanNim))
    .limit(1);

  if (!user) {
    return c.json({ error: "Invalid NIM or password" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid NIM or password" }, 401);
  }

  const sessionId = await createSession(user.id);
  setSessionCookie(c, sessionId);

  const { passwordHash: _, ...safeUser } = user;
  return c.json({ user: safeUser });
});

auth.post("/logout", async (c) => {
  const session = c.get("session");
  if (session) {
    await deleteSession(session.id);
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ success: true });
});

auth.get("/me", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ user: null });
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const needsSemesterUpdate = new Date(user.semesterUpdatedAt) < sixMonthsAgo;

  const { passwordHash: _, ...safeUser } = user;
  return c.json({ user: safeUser, needsSemesterUpdate });
});

export default auth;
