import { Hono } from "hono";
import { eq, ilike, and, or, sql as dSql } from "drizzle-orm";
import { db } from "../db/client";
import { users, teams, teamMembers } from "../db/schema";
import { type HonoEnv, requireAuth } from "../lib/auth";

const router = new Hono<HonoEnv>();

router.get("/", async (c) => {
  const query = c.req.query();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 15));
  const offset = (page - 1) * limit;

  const { search, campus, faculty, major, semester, shift } = query;

  const conditions = [];

  if (campus && campus !== "ALL")
    conditions.push(eq(users.campus, campus as any));
  if (faculty && faculty !== "ALL") conditions.push(eq(users.faculty, faculty));
  if (major && major !== "ALL") conditions.push(eq(users.major, major));
  if (semester !== undefined && semester !== "" && semester !== "ALL") {
    conditions.push(eq(users.semester, Number(semester)));
  }
  if (shift && shift !== "ALL") conditions.push(eq(users.shift, shift as any));

  if (search) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(users.name, term),
        ilike(users.nim, term),
        ilike(users.headline, term),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRes] = await db
    .select({ count: dSql<number>`count(*)::int` })
    .from(users)
    .where(whereClause);

  const total = totalRes?.count || 0;

  const userList = await db
    .select({
      id: users.id,
      nim: users.nim,
      name: users.name,
      campus: users.campus,
      faculty: users.faculty,
      major: users.major,
      degree: users.degree,
      shift: users.shift,
      semester: users.semester,
      avatarSeed: users.avatarSeed,
      headline: users.headline,
      bioMd: users.bioMd,
      linkedinUrl: users.linkedinUrl,
      githubUrl: users.githubUrl,
      instagramUrl: users.instagramUrl,
      websiteUrl: users.websiteUrl,
    })
    .from(users)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(users.createdAt);

  return c.json({
    data: userList,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.get("/:nim", async (c) => {
  const nim = c.req.param("nim");

  const [user] = await db
    .select({
      id: users.id,
      nim: users.nim,
      email: users.email,
      name: users.name,
      campus: users.campus,
      faculty: users.faculty,
      major: users.major,
      degree: users.degree,
      shift: users.shift,
      semester: users.semester,
      avatarSeed: users.avatarSeed,
      headline: users.headline,
      bioMd: users.bioMd,
      linkedinUrl: users.linkedinUrl,
      githubUrl: users.githubUrl,
      instagramUrl: users.instagramUrl,
      twitterUrl: users.twitterUrl,
      websiteUrl: users.websiteUrl,
      resumeUrl: users.resumeUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.nim, nim))
    .limit(1);

  if (!user) {
    return c.json({ error: "Student not found" }, 404);
  }

  const userTeams = await db
    .select({
      team: {
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        eventName: teams.eventName,
        coverImageUrl: teams.coverImageUrl,
      },
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, user.id));

  return c.json({
    user,
    teams: userTeams,
  });
});

router.patch("/me", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const body = await c.req.json();

  const {
    name,
    headline,
    bioMd,
    semester,
    avatarSeed,
    campus,
    faculty,
    major,
    degree,
    shift,
    linkedinUrl,
    githubUrl,
    instagramUrl,
    twitterUrl,
    websiteUrl,
    resumeUrl,
  } = body;

  const updateData: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (name !== undefined) updateData.name = name;
  if (headline !== undefined) updateData.headline = headline;
  if (bioMd !== undefined) updateData.bioMd = bioMd;
  if (avatarSeed !== undefined) updateData.avatarSeed = avatarSeed;
  if (campus !== undefined) updateData.campus = campus;
  if (faculty !== undefined) updateData.faculty = faculty;
  if (major !== undefined) updateData.major = major;
  if (degree !== undefined) updateData.degree = degree;
  if (shift !== undefined) updateData.shift = shift;
  if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;
  if (githubUrl !== undefined) updateData.githubUrl = githubUrl;
  if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl;
  if (twitterUrl !== undefined) updateData.twitterUrl = twitterUrl;
  if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
  if (resumeUrl !== undefined) updateData.resumeUrl = resumeUrl;

  if (semester !== undefined) {
    updateData.semester = Number(semester);
    updateData.semesterUpdatedAt = new Date();
  }

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, currentUser.id))
    .returning();

  const { passwordHash: _, ...safeUser } = updatedUser;
  return c.json({ user: safeUser });
});

export default router;
