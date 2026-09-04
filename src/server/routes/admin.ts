import { Hono } from "hono";
import { eq, ilike, or, sql as dSql } from "drizzle-orm";
import { db } from "../db/client";
import { users, teams, notifications, systemSettings } from "../db/schema";
import { type HonoEnv, requireAdmin } from "../lib/auth";

const router = new Hono<HonoEnv>();

router.use("*", requireAdmin);

router.get("/metrics", async (c) => {
  const [totalStudents] = await db
    .select({ count: dSql<number>`count(*)::int` })
    .from(users);

  const [totalTeams] = await db
    .select({ count: dSql<number>`count(*)::int` })
    .from(teams);

  const [campusDistribution] = await db
    .select({
      meruya: dSql<number>`count(case when campus = 'UMB_MY' then 1 end)::int`,
      menteng: dSql<number>`count(case when campus = 'UMB_MN' then 1 end)::int`,
      warungBuncit: dSql<number>`count(case when campus = 'UMB_WB' then 1 end)::int`,
      cipayung: dSql<number>`count(case when campus = 'UMB_CP' then 1 end)::int`,
    })
    .from(users);

  const [staleSemesterCount] = await db
    .select({ count: dSql<number>`count(*)::int` })
    .from(users)
    .where(dSql`semester_updated_at < now() - interval '6 months'`);

  return c.json({
    totalStudents: totalStudents?.count || 0,
    totalTeams: totalTeams?.count || 0,
    campusDistribution: campusDistribution || {
      meruya: 0,
      menteng: 0,
      warungBuncit: 0,
      cipayung: 0,
    },
    staleSemesterCount: staleSemesterCount?.count || 0,
  });
});

router.post("/broadcast", async (c) => {
  const body = await c.req.json();
  const { title, message, targetCampus } = body;

  if (!title || !message) {
    return c.json({ error: "Title and message are required" }, 400);
  }

  let recipientsQuery = db.select({ id: users.id }).from(users);
  if (targetCampus) {
    recipientsQuery = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.campus, targetCampus as any)) as any;
  }

  const recipients = await recipientsQuery;

  if (recipients.length > 0) {
    const notifsToInsert = recipients.map((r) => ({
      recipientId: r.id,
      type: "SYSTEM_BROADCAST" as const,
      title: title.trim(),
      message: message.trim(),
    }));

    await db.insert(notifications).values(notifsToInsert);
  }

  return c.json({ success: true, count: recipients.length });
});

router.delete("/users/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(users).where(eq(users.id, id));
  return c.json({ success: true });
});

router.delete("/teams/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(teams).where(eq(teams.id, id));
  return c.json({ success: true });
});

router.get("/settings", async (c) => {
  const rows = await db.select().from(systemSettings);
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return c.json({
    helpDocsUrl:
      settings["help_docs_url"] ||
      "mailto:connect@mercubuana.ac.id?subject=UMBC%20Inquiry%20-%20Help%20%26%20Docs",
    supportEmail: settings["support_email"] || "connect@mercubuana.ac.id",
  });
});

router.patch("/settings", async (c) => {
  const body = await c.req.json();
  const { helpDocsUrl, supportEmail } = body;

  if (helpDocsUrl !== undefined) {
    await db
      .insert(systemSettings)
      .values({
        key: "help_docs_url",
        value: String(helpDocsUrl).trim(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: String(helpDocsUrl).trim(), updatedAt: new Date() },
      });
  }

  if (supportEmail !== undefined) {
    await db
      .insert(systemSettings)
      .values({
        key: "support_email",
        value: String(supportEmail).trim(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: String(supportEmail).trim(), updatedAt: new Date() },
      });
  }

  return c.json({ success: true });
});

router.get("/search", async (c) => {
  const type = c.req.query("type") || "user";
  const q = c.req.query("q")?.trim();

  if (!q) {
    return c.json({ data: [] });
  }

  if (type === "user") {
    const matchedUsers = await db
      .select({
        id: users.id,
        nim: users.nim,
        name: users.name,
        email: users.email,
        role: users.role,
        campus: users.campus,
        faculty: users.faculty,
        major: users.major,
        semester: users.semester,
        avatarSeed: users.avatarSeed,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        or(
          ilike(users.name, `%${q}%`),
          ilike(users.nim, `%${q}%`),
          ilike(users.email, `%${q}%`),
        ),
      )
      .limit(10);

    return c.json({ data: matchedUsers });
  } else {
    const matchedTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        eventName: teams.eventName,
        eventUrl: teams.eventUrl,
        accessType: teams.accessType,
        maxMembers: teams.maxMembers,
        targetFaculty: teams.targetFaculty,
        createdAt: teams.createdAt,
        owner: {
          id: users.id,
          name: users.name,
          nim: users.nim,
        },
      })
      .from(teams)
      .leftJoin(users, eq(teams.ownerId, users.id))
      .where(
        or(
          ilike(teams.name, `%${q}%`),
          ilike(teams.slug, `%${q}%`),
          ilike(teams.eventName, `%${q}%`),
        ),
      )
      .limit(10);

    return c.json({ data: matchedTeams });
  }
});

router.patch("/users/:id/role", async (c) => {
  const id = c.req.param("id");
  const { role } = await c.req.json();
  if (!["USER", "ADMIN"].includes(role)) {
    return c.json({ error: "Invalid role" }, 400);
  }
  await db.update(users).set({ role }).where(eq(users.id, id));
  return c.json({ success: true });
});

export default router;
