import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session.js";

describe("session cookie", () => {
  it("round-trips a signed user id", () => {
    const v = signSession("user_1", "secret-secret-secret");
    expect(verifySession(v, "secret-secret-secret")).toBe("user_1");
  });
  it("rejects a different secret", () => {
    const v = signSession("user_1", "a-secret-of-length");
    expect(verifySession(v, "b-secret-of-length")).toBeNull();
  });
  it("rejects tampered ids", () => {
    const v = signSession("user_1", "secret-secret-secret").replace("user_1", "user_2");
    expect(verifySession(v, "secret-secret-secret")).toBeNull();
  });
});
