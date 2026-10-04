import { describe, expect, it } from "vitest";
import { isWithinQuietHours } from "./push.js";

const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m);

describe("isWithinQuietHours", () => {
  it("handles an overnight window", () => {
    expect(isWithinQuietHours("22:00", "08:00", at(23))).toBe(true);
    expect(isWithinQuietHours("22:00", "08:00", at(3))).toBe(true);
    expect(isWithinQuietHours("22:00", "08:00", at(12))).toBe(false);
  });
  it("handles a same-day window", () => {
    expect(isWithinQuietHours("13:00", "14:00", at(13, 30))).toBe(true);
    expect(isWithinQuietHours("13:00", "14:00", at(14))).toBe(false);
  });
  it("treats identical start/end as disabled", () => {
    expect(isWithinQuietHours("09:00", "09:00", at(9))).toBe(false);
  });
});
