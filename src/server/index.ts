import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { authMiddleware, type HonoEnv } from "./lib/auth";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import teamRoutes from "./routes/teams";
import notificationRoutes from "./routes/notifications";
import adminRoutes from "./routes/admin";
import { db } from "./db/client";
import { systemSettings, teams } from "./db/schema";
import { sql } from "drizzle-orm";

const app = new Hono<HonoEnv>();

// Logger
app.use("*", logger());

// CORS configuration (support credentials for Vite dev and production)
app.use(
  "*",
  cors({
    origin: (origin) => origin || "http://localhost:5173",
    credentials: true,
  }),
);

// Auth session resolution
app.use("*", authMiddleware);

// API routes
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/teams", teamRoutes);
app.route("/api/notifications", notificationRoutes);
app.route("/api/admin", adminRoutes);

// Public system settings
app.get("/api/settings", async (c) => {
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

// Health check
app.get("/api/health", (c) =>
  c.json({
    status: "healthy",
    runtime: "bun",
    timestamp: new Date().toISOString(),
  }),
);

// SEO & Crawlers
app.get("/robots.txt", (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  return c.text(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /settings\nDisallow: /teams/create\nDisallow: /teams/my\nDisallow: /api/\n\nSitemap: https://umbc.my.id/sitemap.xml\n`,
  );
});

app.get("/sitemap.xml", async (c) => {
  const staticRoutes = [
    { loc: "https://umbc.my.id/", changefreq: "daily", priority: "1.0" },
    {
      loc: "https://umbc.my.id/explore",
      changefreq: "hourly",
      priority: "0.9",
    },
    { loc: "https://umbc.my.id/teams", changefreq: "hourly", priority: "0.9" },
    {
      loc: "https://umbc.my.id/sign-in",
      changefreq: "monthly",
      priority: "0.5",
    },
    {
      loc: "https://umbc.my.id/sign-up",
      changefreq: "monthly",
      priority: "0.6",
    },
  ];

  let teamUrls = "";
  try {
    const publicTeams = await db
      .select({ slug: teams.slug, updatedAt: teams.updatedAt })
      .from(teams)
      .where(sql`${teams.accessType} != 'CLOSED'`)
      .limit(100);

    if (publicTeams.length > 0) {
      teamUrls = publicTeams
        .map(
          (t) => `  <url>
    <loc>https://umbc.my.id/teams/${t.slug}</loc>
    <lastmod>${(t.updatedAt || new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
        )
        .join("\n");
    }
  } catch (err) {
    console.error("Sitemap dynamic teams fetch error:", err);
  }

  const staticUrls = staticRoutes
    .map(
      (r) => `  <url>
    <loc>${r.loc}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${teamUrls ? teamUrls + "\n" : ""}</urlset>`;

  c.header("Content-Type", "application/xml; charset=utf-8");
  return c.body(xml);
});

// Static client serving and SPA fallback (production)
app.use("/*", serveStatic({ root: "./src/client/dist" }));
app.get("*", serveStatic({ path: "./src/client/dist/index.html" }));

const port = Number(process.env.PORT) || 3000;
console.log(`[UMBC Server] Running on Bun at http://localhost:${port}`);

export { app };
export default {
  port,
  fetch: app.fetch,
  idleTimeout: 255,
};
