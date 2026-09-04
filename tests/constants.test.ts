/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import {
  CAMPUSES,
  FACULTIES,
  getCampusBadge,
  getMajorCode,
  formatSemesterBadge,
  formatSemesterLabel,
  getDiceBearAvatar,
  getAvatarUrl,
} from "../src/client/src/lib/constants";

describe("UMBC Client Constants & Formatters", () => {
  it("should have valid campus definitions", () => {
    expect(CAMPUSES.length).toBeGreaterThanOrEqual(4);
    expect(getCampusBadge("UMB_MY")).toBe("Meruya");
    expect(getCampusBadge("UNKNOWN")).toBe("UNKNOWN");
  });

  it("should resolve faculty major codes correctly", () => {
    expect(getMajorCode("Teknik Informatika")).toBe("TI");
    expect(getMajorCode("TI")).toBe("TI");
    expect(getMajorCode("Sistem Informasi")).toBe("SI");
    expect(getMajorCode("Akuntansi")).toBe("AK");
    expect(getMajorCode("Custom Major")).toBe("Custom Major");
    expect(getMajorCode("")).toBe("");
  });

  it("should format semester badges and labels properly", () => {
    expect(formatSemesterBadge(1)).toBe("SM1");
    expect(formatSemesterBadge(8)).toBe("SM8");
    expect(formatSemesterBadge(0)).toBe("Graduated");
    expect(formatSemesterBadge(null)).toBe("");

    expect(formatSemesterLabel(1)).toBe("Semester 1");
    expect(formatSemesterLabel(8)).toBe("Semester 8");
    expect(formatSemesterLabel(0)).toBe("Graduated");
    expect(formatSemesterLabel(null)).toBe("-");
  });

  it("should handle DiceBear and custom avatar URLs", () => {
    const dicebear = getDiceBearAvatar("41524010014");
    expect(dicebear).toContain("api.dicebear.com");
    expect(dicebear).toContain("41524010014");

    const customUrl = "https://example.com/avatar.jpg";
    expect(getDiceBearAvatar(customUrl)).toBe(customUrl);
    expect(getAvatarUrl(customUrl)).toBe(customUrl);
    expect(getAvatarUrl("", "41524010014")).toContain("41524010014");
  });
});
