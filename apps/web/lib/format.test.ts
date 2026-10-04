import { describe, expect, it } from "vitest";
import { formatCount, initials, timeAgo } from "./format";

describe("timeAgo", () => {
  const now = new Date("2026-10-04T12:00:00Z").getTime();
  it("formats like Instagram", () => {
    expect(timeAgo("2026-10-04T11:58:00Z", now)).toBe("2m");
    expect(timeAgo("2026-10-04T04:00:00Z", now)).toBe("8h");
    expect(timeAgo("2026-10-01T12:00:00Z", now)).toBe("3d");
    expect(timeAgo("2026-09-13T12:00:00Z", now)).toBe("3w");
  });
});

describe("formatCount", () => {
  it("compacts thousands", () => {
    expect(formatCount(980)).toBe("980");
    expect(formatCount(4820)).toBe("4.8K");
    expect(formatCount(62_100)).toBe("62K");
    expect(formatCount(1_250_000)).toBe("1.3M");
  });
});

describe("initials", () => {
  it("derives up to two letters", () => {
    expect(initials("Customer 42")).toBe("C4");
    expect(initials("john.k")).toBe("JK");
  });
});
