/// <reference types="bun-types" />
import { describe, it, expect, afterAll } from "bun:test";
import { app } from "../src/server/index";
import { sql, db } from "../src/server/db/client";
import { users, sessions, teams, teamMembers } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

describe("UMBC Backend API Suite", () => {
  const testNim = "99999999999";
  const testPassword = "testPassword123!";
  let authCookie = "";

  afterAll(async () => {
    // Cleanup created test user and active sessions
    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.nim, testNim),
      });
      if (existingUser) {
        const userTeams = await db.query.teams.findMany({
          where: eq(teams.ownerId, existingUser.id),
        });
        for (const t of userTeams) {
          await db.delete(teamMembers).where(eq(teamMembers.teamId, t.id));
          await db.delete(teams).where(eq(teams.id, t.id));
        }
        await db.delete(sessions).where(eq(sessions.userId, existingUser.id));
        await db.delete(users).where(eq(users.id, existingUser.id));
      }
    } catch (e) {
      console.warn("Cleanup warning:", e);
    }
  });

  describe("Health & System Endpoints", () => {
    it("GET /api/health should return 200 and healthy status", async () => {
      const res = await app.request("/api/health");
      expect(res.status).toBe(200);

      const data = (await res.json()) as { status: string; runtime: string };
      expect(data.status).toBe("healthy");
      expect(data.runtime).toBe("bun");
    });

    it("GET /api/settings should return public system links", async () => {
      const res = await app.request("/api/settings");
      expect(res.status).toBe(200);

      const data = (await res.json()) as {
        helpDocsUrl: string;
        supportEmail: string;
      };
      expect(typeof data.helpDocsUrl).toBe("string");
      expect(typeof data.supportEmail).toBe("string");
      expect(data.helpDocsUrl.length).toBeGreaterThan(0);
      expect(data.supportEmail.length).toBeGreaterThan(0);
    });

    it("GET /robots.txt should return crawler instructions and sitemap link", async () => {
      const res = await app.request("/robots.txt");
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("User-agent: *");
      expect(text).toContain("Allow: /");
      expect(text).toContain("Disallow: /admin");
      expect(text).toContain("Sitemap: https://umbc.my.id/sitemap.xml");
    });

    it("GET /sitemap.xml should return valid XML sitemap with canonical URLs", async () => {
      const res = await app.request("/sitemap.xml");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/xml");
      const xml = await res.text();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain("<urlset");
      expect(xml).toContain("https://umbc.my.id/");
      expect(xml).toContain("https://umbc.my.id/explore");
      expect(xml).toContain("https://umbc.my.id/teams");
    });
  });

  describe("Authentication & Session Flow", () => {
    it("GET /api/auth/me should return null user when unauthenticated", async () => {
      const res = await app.request("/api/auth/me");
      expect(res.status).toBe(200);
      const data = (await res.json()) as { user: any };
      expect(data.user).toBeNull();
    });

    it("POST /api/auth/login should reject invalid credentials", async () => {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nim: "00000000000",
          password: "wrong-password",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("POST /api/auth/register should register a new student user", async () => {
      // First ensure clean state
      const existing = await db.query.users.findFirst({
        where: eq(users.nim, testNim),
      });
      if (existing) {
        await db.delete(sessions).where(eq(sessions.userId, existing.id));
        await db.delete(users).where(eq(users.id, existing.id));
      }

      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nim: testNim,
          name: "Test Student Runner",
          password: testPassword,
          campus: "Meruya",
          faculty: "Fakultas Ilmu Komputer",
          major: "Teknik Informatika",
          shift: "Reguler 1",
          semester: 4,
          disclaimerAccepted: true,
        }),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as {
        user?: { nim: string; name: string };
      };
      expect(data.user?.nim).toBe(testNim);

      // Verify Set-Cookie header contains session
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeTruthy();
      if (setCookie) {
        const match = setCookie.match(/umbc_session=([^;]+)/);
        expect(match).toBeTruthy();
        if (match) {
          authCookie = `umbc_session=${match[1]}`;
        }
      }
    });

    it("GET /api/auth/me should return user data when session cookie is provided", async () => {
      expect(authCookie).toBeTruthy();
      const res = await app.request("/api/auth/me", {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        user?: { nim: string; name: string };
      };
      expect(data.user?.nim).toBe(testNim);
      expect(data.user?.name).toBe("Test Student Runner");
    });

    it("GET /api/notifications should retrieve authenticated user's notification inbox", async () => {
      const res = await app.request("/api/notifications", {
        headers: {
          Cookie: authCookie,
        },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { data: any[]; unreadCount: number };
      expect(Array.isArray(data.data)).toBe(true);
      expect(typeof data.unreadCount).toBe("number");
    });

    it("POST /api/teams should allow authenticated user to create a new team", async () => {
      const res = await app.request("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: "Test Runner Squad",
          slug: "test-runner-squad",
          eventName: "Gemini Hackathon 2026",
          eventUrl: "https://example.com/hackathon",
          contentMd: "Building awesome apps with Bun and React!",
          maxMembers: 4,
          accessType: "OPEN",
        }),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as {
        team?: { slug: string; name: string };
      };
      expect(data.team?.slug).toBe("test-runner-squad");
    });

    it("GET /api/teams/:slug should retrieve the created team details", async () => {
      const res = await app.request("/api/teams/test-runner-squad");
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        team?: { name: string; slug: string };
      };
      expect(data.team?.slug).toBe("test-runner-squad");
      expect(data.team?.name).toBe("Test Runner Squad");
    });

    it("POST /api/auth/logout should clear session and invalidate access", async () => {
      const res = await app.request("/api/auth/logout", {
        method: "POST",
        headers: {
          Cookie: authCookie,
        },
      });
      expect(res.status).toBe(200);

      // Verify subsequent request with old cookie returns null user
      const checkRes = await app.request("/api/auth/me", {
        headers: {
          Cookie: authCookie,
        },
      });
      expect(checkRes.status).toBe(200);
      const data = (await checkRes.json()) as { user: any };
      expect(data.user).toBeNull();
    });
  });

  describe("Protected Endpoints Authorization", () => {
    it("POST /api/teams should reject unauthenticated team creation", async () => {
      const res = await app.request("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Unauthorized Team",
          description: "This should fail",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/settings should reject unauthenticated requests", async () => {
      const res = await app.request("/api/admin/settings");
      expect([401, 403]).toContain(res.status);
    });

    it("GET /api/admin/users should reject unauthenticated requests", async () => {
      const res = await app.request("/api/admin/users");
      expect([401, 403]).toContain(res.status);
    });

    it("GET /api/teams should be publicly readable", async () => {
      const res = await app.request("/api/teams");
      expect(res.status).toBe(200);
      const data = (await res.json()) as { data: any[] };
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("GET /api/users should return student directory", async () => {
      const res = await app.request("/api/users");
      expect(res.status).toBe(200);
      const data = (await res.json()) as { data: any[] };
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});
