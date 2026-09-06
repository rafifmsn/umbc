import { Hono } from "hono";
import { eq, ilike, and, or, sql as dSql } from "drizzle-orm";
import { db } from "../db/client";
import { teams, teamMembers, users, notifications } from "../db/schema";
import { type HonoEnv, requireAuth } from "../lib/auth";
import { enqueueNotification } from "../lib/queue/producer";

const router = new Hono<HonoEnv>();
let lastAutoCloseCheck = 0;
const AUTO_CLOSE_INTERVAL_MS = 5 * 60 * 1000; // run background sweep at most once every 5 minutes

router.get("/", async (c) => {
  const query = c.req.query();
  const search = query.search?.trim();
  const sort = query.sort?.trim();
  const faculty = query.faculty?.trim();
  const status = query.status?.trim() || query.accessType?.trim();
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.max(1, Math.min(50, parseInt(query.limit || "12", 10)));
  const offset = (page - 1) * limit;

  // Throttled non-blocking background sweep to prevent table write-locks during reads
  const now = Date.now();
  if (now - lastAutoCloseCheck > AUTO_CLOSE_INTERVAL_MS) {
    lastAutoCloseCheck = now;
    db.execute(
      dSql`
      UPDATE teams
      SET access_type = 'CLOSED', updated_at = NOW()
      WHERE access_type != 'CLOSED'
        AND (
          (end_date IS NOT NULL AND end_date < NOW())
          OR (SELECT count(*) FROM team_members WHERE team_members.team_id = teams.id) >= max_members
        )
    `,
    ).catch((err) => console.error("Auto-close background sweep error:", err));
  }

  const conditions = [];

  if (search) {
    const term = `%${search}%`;
    conditions.push(or(ilike(teams.name, term), ilike(teams.eventName, term)));
  }

  if (faculty && faculty !== "ALL") {
    conditions.push(eq(teams.targetFaculty, faculty));
  }

  if (status === "CLOSED") {
    conditions.push(eq(teams.accessType, "CLOSED"));
  } else if (status === "INVITE_ONLY") {
    conditions.push(eq(teams.accessType, "INVITE_ONLY"));
  } else if (status === "OPEN") {
    conditions.push(eq(teams.accessType, "OPEN"));
  } else {
    // Default: Closed teams are not mapped in browse unless explicitly filtered
    conditions.push(dSql`${teams.accessType} != 'CLOSED'`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy;
  if (sort === "deadline_asc") {
    orderBy = dSql`${teams.endDate} ASC NULLS LAST`;
  } else if (sort === "deadline_desc") {
    orderBy = dSql`${teams.endDate} DESC NULLS LAST`;
  } else if (sort === "oldest") {
    orderBy = dSql`${teams.createdAt} ASC`;
  } else {
    orderBy = dSql`${teams.createdAt} DESC`;
  }

  const [totalResult] = await db
    .select({ count: dSql<number>`count(*)::int` })
    .from(teams)
    .where(whereClause);

  const total = totalResult?.count || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const teamList = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      coverImageUrl: teams.coverImageUrl,
      eventName: teams.eventName,
      eventUrl: teams.eventUrl,
      startDate: teams.startDate,
      endDate: teams.endDate,
      accessType: teams.accessType,
      maxMembers: teams.maxMembers,
      targetFaculty: teams.targetFaculty,
      createdAt: teams.createdAt,
      owner: {
        id: users.id,
        name: users.name,
        nim: users.nim,
        avatarSeed: users.avatarSeed,
      },
      memberCount: dSql<number>`(select count(*) from team_members where team_members.team_id = teams.id)::int`,
      membersPreview: dSql<
        Array<{ id: string; name: string; avatarSeed: string }>
      >`
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatarSeed', u.avatar_seed))
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = teams.id
          ),
          '[]'::json
        )
      `,
    })
    .from(teams)
    .innerJoin(users, eq(teams.ownerId, users.id))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return c.json({
    data: teamList,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

router.get("/my", requireAuth, async (c) => {
  const currentUser = c.get("user")!;

  const myTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      coverImageUrl: teams.coverImageUrl,
      eventName: teams.eventName,
      eventUrl: teams.eventUrl,
      contentMd: teams.contentMd,
      startDate: teams.startDate,
      endDate: teams.endDate,
      accessType: teams.accessType,
      maxMembers: teams.maxMembers,
      targetFaculty: teams.targetFaculty,
      ownerId: teams.ownerId,
      createdAt: teams.createdAt,
      myRole: teamMembers.role,
      memberCount: dSql<number>`(select count(*) from team_members tm where tm.team_id = teams.id)::int`,
      members: dSql<
        Array<{
          id: string;
          role: string;
          user: { id: string; name: string; nim: string; avatarSeed: string };
        }>
      >`
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', tm.id,
                'role', tm.role,
                'user', json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'nim', u.nim,
                  'avatarSeed', u.avatar_seed
                )
              )
            )
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = teams.id
          ),
          '[]'::json
        )
      `,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, currentUser.id))
    .orderBy(teams.createdAt);

  return c.json({ data: myTeams });
});

router.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.slug, slug))
    .limit(1);

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  const members = await db
    .select({
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        nim: users.nim,
        campus: users.campus,
        major: users.major,
        degree: users.degree,
        semester: users.semester,
        avatarSeed: users.avatarSeed,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, team.id));

  return c.json({ team, members });
});

router.post("/", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const body = await c.req.json();

  const {
    name,
    slug,
    coverImageUrl,
    eventName,
    eventUrl,
    contentMd,
    startDate,
    endDate,
    accessType = "OPEN",
    maxMembers = 5,
    targetFaculty,
    memberNims = [],
  } = body;

  if (!name || !slug || !eventName || !eventUrl || !contentMd) {
    return c.json({ error: "All required fields must be provided" }, 400);
  }

  const cleanSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");

  const [existing] = await db
    .select()
    .from(teams)
    .where(eq(teams.slug, cleanSlug))
    .limit(1);

  if (existing) {
    return c.json({ error: "Team with this URL slug already exists" }, 409);
  }

  const [createdTeam] = await db
    .insert(teams)
    .values({
      name: name.trim(),
      slug: cleanSlug,
      coverImageUrl: coverImageUrl?.trim() || null,
      eventName: eventName.trim(),
      eventUrl: eventUrl.trim(),
      contentMd: contentMd.trim(),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      accessType: ["OPEN", "INVITE_ONLY", "CLOSED"].includes(accessType)
        ? accessType
        : "OPEN",
      maxMembers: Math.max(1, parseInt(maxMembers, 10) || 5),
      targetFaculty: targetFaculty?.trim() || null,
      ownerId: currentUser.id,
    })
    .returning();

  // Add owner as Owner
  await db.insert(teamMembers).values({
    teamId: createdTeam.id,
    userId: currentUser.id,
    role: "Owner",
  });

  // Add other members if NIMs specified
  if (Array.isArray(memberNims) && memberNims.length > 0) {
    for (const nim of memberNims) {
      const cleanNim = String(nim).trim();
      if (!cleanNim || cleanNim === currentUser.nim) continue;

      const [memberUser] = await db
        .select()
        .from(users)
        .where(eq(users.nim, cleanNim))
        .limit(1);

      if (memberUser) {
        await db
          .insert(teamMembers)
          .values({
            teamId: createdTeam.id,
            userId: memberUser.id,
            role: "Member",
          })
          .onConflictDoNothing();

        await enqueueNotification({
          recipientId: memberUser.id,
          senderId: currentUser.id,
          type: "TEAM_INVITE",
          title: `Added to ${createdTeam.name}`,
          message: `${currentUser.name} added you to the squad "${createdTeam.name}" for ${createdTeam.eventName}.`,
        });
      }
    }
  }

  return c.json({ team: createdTeam }, 201);
});

router.delete("/:teamId/members/:userId", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const teamId = c.req.param("teamId");
  const targetUserId = c.req.param("userId");

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  const isOwner = team.ownerId === currentUser.id;
  const isSelf = targetUserId === currentUser.id;

  if (!isOwner && !isSelf) {
    return c.json({ error: "Permission denied" }, 403);
  }

  if (targetUserId === team.ownerId) {
    return c.json({ error: "Cannot remove team owner" }, 400);
  }

  await db
    .delete(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)),
    );

  return c.json({ success: true });
});

router.patch("/:id", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const teamId = c.req.param("id");
  const body = await c.req.json();

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  const isOwner = team.ownerId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return c.json({ error: "Permission denied" }, 403);
  }

  const {
    name,
    coverImageUrl,
    eventName,
    eventUrl,
    contentMd,
    startDate,
    endDate,
    accessType,
    maxMembers,
    targetFaculty,
  } = body;

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (name) updateData.name = name.trim();
  if (coverImageUrl !== undefined) {
    updateData.coverImageUrl = coverImageUrl?.trim() || null;
  }
  if (eventName) updateData.eventName = eventName.trim();
  if (eventUrl) updateData.eventUrl = eventUrl.trim();
  if (contentMd) updateData.contentMd = contentMd.trim();
  if (startDate !== undefined)
    updateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined)
    updateData.endDate = endDate ? new Date(endDate) : null;
  if (accessType && ["OPEN", "INVITE_ONLY", "CLOSED"].includes(accessType)) {
    updateData.accessType = accessType;
  }
  if (maxMembers) updateData.maxMembers = Math.max(1, parseInt(maxMembers, 10));
  if (targetFaculty !== undefined)
    updateData.targetFaculty = targetFaculty?.trim() || null;

  const [updatedTeam] = await db
    .update(teams)
    .set(updateData)
    .where(eq(teams.id, teamId))
    .returning();

  return c.json({ team: updatedTeam });
});

router.post("/:id/members", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const teamId = c.req.param("id");
  const { nim, role = "Member" } = await c.req.json();

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  const isOwner = team.ownerId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return c.json({ error: "Permission denied" }, 403);
  }

  const [memberUser] = await db
    .select()
    .from(users)
    .where(eq(users.nim, String(nim).trim()))
    .limit(1);

  if (!memberUser) {
    return c.json({ error: "Student with this NIM not found" }, 404);
  }

  const [createdMember] = await db
    .insert(teamMembers)
    .values({
      teamId,
      userId: memberUser.id,
      role: role || "Member",
    })
    .onConflictDoNothing()
    .returning();

  if (createdMember) {
    await enqueueNotification({
      recipientId: memberUser.id,
      senderId: currentUser.id,
      type: "TEAM_INVITE",
      title: `Added to ${team.name}`,
      message: `${currentUser.name} added you to the squad "${team.name}" for ${team.eventName}.`,
    });
  }

  return c.json({ member: createdMember, user: memberUser }, 201);
});

router.post("/:id/join", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const teamId = c.req.param("id");

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  // Check if user is already a member
  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, team.id),
        eq(teamMembers.userId, currentUser.id),
      ),
    )
    .limit(1);

  if (existing) {
    return c.json({ error: "You are already a member of this team" }, 400);
  }

  // Check recruitment access
  if (team.accessType === "CLOSED") {
    return c.json(
      { error: "This team is currently closed for recruitment" },
      400,
    );
  }

  if (team.accessType === "INVITE_ONLY") {
    return c.json(
      { error: "This squad is invite-only. Contact the owner to join." },
      400,
    );
  }

  // Check capacity
  const [memberCountRes] = await db
    .select({ count: dSql<number>`count(*)::int` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id));

  const currentCount = memberCountRes?.count || 0;
  const maxAllowed = team.maxMembers || 5;

  if (currentCount >= maxAllowed) {
    await db
      .update(teams)
      .set({ accessType: "CLOSED", updatedAt: new Date() })
      .where(eq(teams.id, team.id));
    return c.json(
      { error: "This team has already reached maximum member capacity" },
      400,
    );
  }

  const [newMember] = await db
    .insert(teamMembers)
    .values({
      teamId: team.id,
      userId: currentUser.id,
      role: "Member",
    })
    .returning();

  // If newly joined member fills capacity, auto-close
  if (currentCount + 1 >= maxAllowed) {
    await db
      .update(teams)
      .set({ accessType: "CLOSED", updatedAt: new Date() })
      .where(eq(teams.id, team.id));
  }

  // Notify team owner
  await enqueueNotification({
    recipientId: team.ownerId,
    senderId: currentUser.id,
    type: "TEAM_INVITE",
    title: `New member joined ${team.name}`,
    message: `${currentUser.name} (${currentUser.nim}) joined your squad "${team.name}".`,
  });

  return c.json({ success: true, member: newMember }, 201);
});

router.delete("/:id", requireAuth, async (c) => {
  const currentUser = c.get("user")!;
  const teamId = c.req.param("id");

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  const isOwner = team.ownerId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return c.json({ error: "Permission denied" }, 403);
  }

  // Delete team members first
  await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));

  // Delete team
  await db.delete(teams).where(eq(teams.id, teamId));

  return c.json({ success: true, message: "Team deleted successfully" });
});

export default router;
