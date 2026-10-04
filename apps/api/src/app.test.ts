import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadEnv } from "./config.js";

const env = loadEnv({ NODE_ENV: "test", MOCK_META: "1", SESSION_SECRET: "test-secret-test-secret" });
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp(env);
  await app.ready();
});
afterAll(async () => app.close());

describe("api (mock mode)", () => {
  it("reports health", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, mock: true });
  });

  it("lists three accounts", async () => {
    const res = await app.inject({ method: "GET", url: "/accounts" });
    expect(res.json().accounts).toHaveLength(3);
    expect(res.json().max).toBe(3);
  });

  it("filters the unified inbox by account", async () => {
    const all = await app.inject({ method: "GET", url: "/inbox/conversations" });
    const biz = await app.inject({ method: "GET", url: "/inbox/conversations?accountId=acc_business" });
    expect(all.json().conversations.length).toBeGreaterThan(biz.json().conversations.length);
    expect(biz.json().conversations.every((c: { accountId: string }) => c.accountId === "acc_business")).toBe(true);
  });

  it("refuses to send from the wrong account (reply safety)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/inbox/messages",
      payload: { accountId: "acc_personal", conversationId: "t_mohamed", text: "hi" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("sends a message and echoes the sending account", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/inbox/messages",
      payload: { accountId: "acc_business", conversationId: "t_mohamed", text: "Yes, around all day." },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sentAs.username).toBe("yourbusiness");
    const thread = await app.inject({ method: "GET", url: "/inbox/conversations/t_mohamed" });
    expect(thread.json().conversation.needsReply).toBe(false);
  });

  it("answers the four dashboard questions", async () => {
    const res = await app.inject({ method: "GET", url: "/business/dashboard" });
    const d = res.json();
    for (const k of ["unreadDms", "needReply", "unansweredComments", "scheduled"]) expect(typeof d[k]).toBe("number");
    expect(d.accounts).toHaveLength(3);
  });

  it("serves supported audio with an availability notice", async () => {
    const res = await app.inject({ method: "GET", url: "/audio?accountId=acc_business&q=golden" });
    expect(res.json().tracks[0].title).toBe("Golden Hour Walk");
    expect(res.json().notice).toMatch(/availability/i);
  });

  it("schedules a draft and lists it", async () => {
    const publishAt = new Date(Date.now() + 3_600_000).toISOString();
    const res = await app.inject({ method: "POST", url: "/publish", payload: { draftId: "d1", accountId: "acc_business", publishAt } });
    expect(res.statusCode).toBe(200);
    expect(res.json().publishAs.label).toBe("Business");
    const list = await app.inject({ method: "GET", url: "/scheduled" });
    expect(list.json().scheduled.some((s: { id: string }) => s.id === res.json().scheduled.id)).toBe(true);
  });

  it("rejects captions with too many hashtags", async () => {
    const caption = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(" ");
    const res = await app.inject({
      method: "PUT",
      url: "/drafts",
      payload: { accountId: "acc_business", type: "image", caption, mediaAssetIds: [], edits: { trimStartSec: null, trimEndSec: null, aspect: null, rotation: 0, originalVolume: 1, audioVolume: 1, textOverlays: [], coverTimeSec: null, coverAssetId: null }, audioTrackId: null, originalAudioTitle: null, shareToFeed: true, locationId: null, userTags: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("verifies webhook subscription with the configured token", async () => {
    const withToken = await buildApp(loadEnv({ NODE_ENV: "test", MOCK_META: "1", META_WEBHOOK_VERIFY_TOKEN: "abc" }));
    const ok = await withToken.inject({ method: "GET", url: "/webhooks/meta?hub.mode=subscribe&hub.verify_token=abc&hub.challenge=123" });
    expect(ok.body).toBe("123");
    const bad = await withToken.inject({ method: "GET", url: "/webhooks/meta?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=123" });
    expect(bad.statusCode).toBe(403);
    await withToken.close();
  });
});

describe("url tolerance", () => {
  it("accepts a duplicated leading slash from a trailing-slash API_URL", async () => {
    const res = await app.inject({ method: "GET", url: "//accounts" });
    expect(res.statusCode).toBe(200);
  });
});

describe("mock connect flow", () => {
  it("redirects back to the calling web origin", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/meta/start", headers: { referer: "https://igclone.vercel.app/settings" } });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://igclone.vercel.app/settings?connected=mock");
  });
});
