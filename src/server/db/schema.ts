import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    nim: text("nim").notNull().unique(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["USER", "ADMIN"] })
      .default("USER")
      .notNull(),
    campus: text("campus", {
      enum: ["UMB_MY", "UMB_MN", "UMB_WB", "UMB_CP"],
    }).notNull(),
    faculty: text("faculty").notNull(),
    major: text("major").notNull(),
    degree: text("degree").default("S1").notNull(),
    shift: text("shift", { enum: ["REGULER_1", "REGULER_2"] }).notNull(),
    semester: integer("semester").default(1).notNull(),
    semesterUpdatedAt: timestamp("semester_updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    avatarSeed: text("avatar_seed").notNull(),
    headline: text("headline"),
    bioMd: text("bio_md"),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    instagramUrl: text("instagram_url"),
    twitterUrl: text("twitter_url"),
    websiteUrl: text("website_url"),
    resumeUrl: text("resume_url"),
    disclaimerAccepted: boolean("disclaimer_accepted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_nim_idx").on(table.nim),
    uniqueIndex("users_email_idx").on(table.email),
    index("users_campus_idx").on(table.campus),
    index("users_faculty_idx").on(table.faculty),
    index("users_semester_idx").on(table.semester),
  ],
);

export const sessions = pgTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teams = pgTable(
  "teams",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    coverImageUrl: text("cover_image_url"),
    eventName: text("event_name").notNull(),
    eventUrl: text("event_url").notNull(),
    contentMd: text("content_md").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    accessType: text("access_type", {
      enum: ["OPEN", "INVITE_ONLY", "CLOSED"],
    })
      .default("OPEN")
      .notNull(),
    maxMembers: integer("max_members").default(5).notNull(),
    targetFaculty: text("target_faculty"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("teams_slug_idx").on(table.slug)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("Member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("team_user_idx").on(table.teamId, table.userId),
    index("team_members_team_idx").on(table.teamId),
    index("team_members_user_idx").on(table.userId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    senderId: text("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: text("type", {
      enum: ["SEMESTER_CHECK", "NOTE", "TEAM_INVITE", "SYSTEM_BROADCAST"],
    }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifs_recipient_idx").on(table.recipientId),
    index("notifs_read_idx").on(table.read),
  ],
);

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
