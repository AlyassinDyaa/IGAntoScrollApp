import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeWebhookBody, verifyWebhookSignature } from "./webhooks";

describe("verifyWebhookSignature", () => {
  it("accepts a valid signature", () => {
    const body = JSON.stringify({ object: "instagram", entry: [] });
    const sig = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
    expect(verifyWebhookSignature("secret", body, sig)).toBe(true);
  });
  it("rejects a tampered body", () => {
    const sig = "sha256=" + createHmac("sha256", "secret").update("a").digest("hex");
    expect(verifyWebhookSignature("secret", "b", sig)).toBe(false);
  });
  it("rejects a missing header", () => {
    expect(verifyWebhookSignature("secret", "a", undefined)).toBe(false);
  });
});

describe("normalizeWebhookBody", () => {
  it("flags a shared reel message", () => {
    const events = normalizeWebhookBody({
      object: "instagram",
      entry: [
        {
          id: "ig1",
          time: 1,
          messaging: [
            {
              sender: { id: "s" },
              recipient: { id: "ig1" },
              timestamp: 2,
              message: { mid: "m1", attachments: [{ type: "ig_reel", payload: {} }] },
            },
          ],
        },
      ],
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("message");
    expect(events[0]?.hasSharedMedia).toBe(true);
  });
  it("normalizes comment changes", () => {
    const events = normalizeWebhookBody({
      object: "instagram",
      entry: [{ id: "ig1", time: 1, changes: [{ field: "comments", value: { id: "c1", text: "hi", media: { id: "md" } } }] }],
    });
    expect(events[0]?.kind).toBe("comment");
    expect(events[0]?.commentId).toBe("c1");
    expect(events[0]?.mediaId).toBe("md");
  });
});
