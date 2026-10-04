import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Meta signs webhook bodies with X-Hub-Signature-256 = "sha256=" + HMAC(appSecret, rawBody).
 * The API must verify this before trusting any event.
 */
export function verifyWebhookSignature(
  appSecret: string,
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

/** Subscribe the Page to the events we handle. Run once per connected account. */
export const WEBHOOK_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_reactions",
  "messaging_seen",
  "comments",
  "mentions",
] as const;

export type WebhookEventKind =
  | "message"
  | "reaction"
  | "comment"
  | "mention"
  | "read"
  | "unknown";

export interface NormalizedWebhookEvent {
  kind: WebhookEventKind;
  igUserId: string;
  senderId: string | null;
  recipientId: string | null;
  messageId: string | null;
  text: string | null;
  /** True when a shared Reel/post attachment is present (triggers "sent you a Reel"). */
  hasSharedMedia: boolean;
  reaction: string | null;
  commentId: string | null;
  mediaId: string | null;
  timestamp: number;
  raw: unknown;
}

interface WebhookBody {
  object: string;
  entry: {
    id: string;
    time: number;
    messaging?: Record<string, any>[];
    changes?: { field: string; value: Record<string, any> }[];
  }[];
}

export function normalizeWebhookBody(body: unknown): NormalizedWebhookEvent[] {
  const parsed = body as WebhookBody;
  if (!parsed || parsed.object !== "instagram" || !Array.isArray(parsed.entry)) return [];
  const out: NormalizedWebhookEvent[] = [];
  for (const entry of parsed.entry) {
    for (const m of entry.messaging ?? []) {
      const base = {
        igUserId: entry.id,
        senderId: m.sender?.id ?? null,
        recipientId: m.recipient?.id ?? null,
        timestamp: m.timestamp ?? entry.time,
        commentId: null,
        mediaId: null,
        raw: m,
      };
      if (m.message) {
        const attachments: { type?: string }[] = m.message.attachments ?? [];
        out.push({
          ...base,
          kind: "message",
          messageId: m.message.mid ?? null,
          text: m.message.text ?? null,
          hasSharedMedia: attachments.some((a) => a.type === "ig_reel" || a.type === "share"),
          reaction: null,
        });
      } else if (m.reaction) {
        out.push({
          ...base,
          kind: "reaction",
          messageId: m.reaction.mid ?? null,
          text: null,
          hasSharedMedia: false,
          reaction: m.reaction.action === "react" ? (m.reaction.emoji ?? m.reaction.reaction ?? null) : null,
        });
      } else if (m.read) {
        out.push({ ...base, kind: "read", messageId: m.read.mid ?? null, text: null, hasSharedMedia: false, reaction: null });
      } else {
        out.push({ ...base, kind: "unknown", messageId: null, text: null, hasSharedMedia: false, reaction: null });
      }
    }
    for (const c of entry.changes ?? []) {
      const v = c.value ?? {};
      out.push({
        kind: c.field === "comments" ? "comment" : c.field === "mentions" ? "mention" : "unknown",
        igUserId: entry.id,
        senderId: v.from?.id ?? null,
        recipientId: null,
        messageId: null,
        text: v.text ?? null,
        hasSharedMedia: false,
        reaction: null,
        commentId: v.id ?? v.comment_id ?? null,
        mediaId: v.media?.id ?? v.media_id ?? null,
        timestamp: entry.time,
        raw: c,
      });
    }
  }
  return out;
}
