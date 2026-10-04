import type { AudioTrack, Comment, ConnectedAccount, Conversation, Draft, Message, OwnedMedia } from "@ig-focus-hub/shared";
import { PUBLISH_LIMITS } from "@ig-focus-hub/shared";
import {
  MetaClient,
  createMediaContainer,
  getContainerStatus,
  getMediaPermalink,
  hideComment,
  listComments,
  listConversations,
  listMessages,
  listOriginalAudio,
  listOwnedMedia,
  listTrendingAudio,
  publishContainer,
  reactToMessage,
  replyToComment,
  searchAudio,
  sendImageMessage,
  sendTextMessage,
  type GraphMessage,
} from "@ig-focus-hub/meta";
import type { MetaGateway } from "../types.js";

export interface TokenResolver {
  /** Returns the decrypted page access token for an account. */
  pageToken(accountId: string): Promise<string>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Real Meta integration. Every call goes through the Graph API with the account's page token. */
export class GraphGateway implements MetaGateway {
  constructor(
    private readonly client: MetaClient,
    private readonly tokens: TokenResolver,
  ) {}

  async syncConversations(account: ConnectedAccount): Promise<Conversation[]> {
    const token = await this.tokens.pageToken(account.id);
    const res = await listConversations(this.client, account.pageId, token);
    return res.data.map((c) => {
      const other = c.participants.data.find((p) => p.id !== account.igUserId) ?? c.participants.data[0];
      const last = c.messages?.data[0];
      return {
        id: c.id,
        accountId: account.id,
        participant: {
          igUserId: other?.id ?? "",
          username: other?.username ?? other?.name ?? "unknown",
          name: other?.name ?? null,
          avatarUrl: null,
        },
        lastMessagePreview: last?.message ?? "sent an attachment",
        lastMessageAt: last?.created_time ?? c.updated_time,
        unreadCount: 0,
        needsReply: last ? last.from.id !== account.igUserId : false,
        favorite: false,
        mutedLocally: false,
        labels: [],
        priority: false,
      };
    });
  }

  async syncMessages(account: ConnectedAccount, conversation: Conversation): Promise<Message[]> {
    const token = await this.tokens.pageToken(account.id);
    const res = await listMessages(this.client, conversation.id, token);
    return res.data.map((m) => toMessage(m, account.igUserId, conversation.id)).reverse();
  }

  async sendText(account: ConnectedAccount, conversation: Conversation, text: string): Promise<Message> {
    const token = await this.tokens.pageToken(account.id);
    const res = await sendTextMessage(this.client, account.igUserId, token, conversation.participant.igUserId, text);
    return {
      id: res.message_id,
      conversationId: conversation.id,
      fromMe: true,
      text,
      attachments: [],
      reactions: [],
      sentAt: new Date().toISOString(),
    };
  }

  async sendImage(account: ConnectedAccount, conversation: Conversation, imageUrl: string, text: string): Promise<Message> {
    const token = await this.tokens.pageToken(account.id);
    const res = await sendImageMessage(this.client, account.igUserId, token, conversation.participant.igUserId, imageUrl);
    if (text.trim()) await sendTextMessage(this.client, account.igUserId, token, conversation.participant.igUserId, text.trim());
    return {
      id: res.message_id,
      conversationId: conversation.id,
      fromMe: true,
      text: text.trim() || null,
      attachments: [{ kind: "image", url: imageUrl, permalink: null, thumbnailUrl: imageUrl }],
      reactions: [],
      sentAt: new Date().toISOString(),
    };
  }

  async react(account: ConnectedAccount, conversation: Conversation, messageId: string, emoji: string, action: "react" | "unreact") {
    const token = await this.tokens.pageToken(account.id);
    await reactToMessage(this.client, account.igUserId, token, conversation.participant.igUserId, messageId, emoji, action);
  }

  async searchAudio(account: ConnectedAccount, query: string): Promise<AudioTrack[]> {
    return searchAudio(this.client, account.igUserId, await this.tokens.pageToken(account.id), query);
  }
  async trendingAudio(account: ConnectedAccount): Promise<AudioTrack[]> {
    return listTrendingAudio(this.client, account.igUserId, await this.tokens.pageToken(account.id));
  }
  async originalAudio(account: ConnectedAccount): Promise<AudioTrack[]> {
    return listOriginalAudio(this.client, account.igUserId, await this.tokens.pageToken(account.id));
  }

  /**
   * Container -> poll -> publish. Media URLs must be publicly reachable over HTTPS.
   * Carousels create child containers first; Reels attach audio + cover + share_to_feed.
   */
  async publish(account: ConnectedAccount, draft: Draft, mediaUrls: string[]) {
    const token = await this.tokens.pageToken(account.id);
    const ig = account.igUserId;
    const userTags = draft.userTags.length ? draft.userTags : undefined;
    const base = { caption: draft.caption, locationId: draft.locationId ?? undefined, userTags };

    let creationId: string;
    if (draft.type === "carousel") {
      if (mediaUrls.length < PUBLISH_LIMITS.carouselMinItems || mediaUrls.length > PUBLISH_LIMITS.carouselMaxItems) {
        throw new Error(`Carousels need ${PUBLISH_LIMITS.carouselMinItems}-${PUBLISH_LIMITS.carouselMaxItems} items`);
      }
      const children: string[] = [];
      for (const url of mediaUrls) {
        const isVideo = /\.(mp4|mov)(\?|$)/i.test(url);
        const child = await createMediaContainer(
          this.client, ig, token,
          isVideo ? { kind: "video_item", videoUrl: url } : { kind: "image", imageUrl: url, isCarouselItem: true },
        );
        if (isVideo) await this.waitForContainer(child.id, token);
        children.push(child.id);
      }
      creationId = (await createMediaContainer(this.client, ig, token, { kind: "carousel", childrenIds: children, ...base })).id;
    } else if (draft.type === "reel" || draft.type === "video") {
      const videoUrl = mediaUrls[0];
      if (!videoUrl) throw new Error("A video is required");
      const coverTimeMs = draft.edits.coverTimeSec != null ? Math.round(draft.edits.coverTimeSec * 1000) : undefined;
      creationId = (
        await createMediaContainer(this.client, ig, token, {
          kind: "reel",
          videoUrl,
          thumbOffsetMs: coverTimeMs,
          shareToFeed: draft.shareToFeed,
          audioId: draft.audioTrackId ?? undefined,
          audioName: draft.originalAudioTitle ?? undefined,
          ...base,
        })
      ).id;
      await this.waitForContainer(creationId, token);
    } else {
      const imageUrl = mediaUrls[0];
      if (!imageUrl) throw new Error("An image is required");
      creationId = (await createMediaContainer(this.client, ig, token, { kind: "image", imageUrl, ...base })).id;
    }

    const published = await publishContainer(this.client, ig, token, creationId);
    const media = await getMediaPermalink(this.client, published.id, token).catch(() => ({ permalink: undefined }));
    return { igMediaId: published.id, permalink: media.permalink ?? null };
  }

  private async waitForContainer(containerId: string, token: string, timeoutMs = 5 * 60_000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const s = await getContainerStatus(this.client, containerId, token);
      if (s.status_code === "FINISHED" || s.status_code === "PUBLISHED") return;
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
        throw new Error(`Media processing ${s.status_code.toLowerCase()}: ${s.status ?? ""}`.trim());
      }
      await sleep(5000);
    }
    throw new Error("Timed out waiting for Meta to process the media");
  }

  async syncOwnedMedia(account: ConnectedAccount): Promise<OwnedMedia[]> {
    const token = await this.tokens.pageToken(account.id);
    const res = await listOwnedMedia(this.client, account.igUserId, token);
    return res.data.map((m) => ({
      id: m.id,
      accountId: account.id,
      type:
        m.media_product_type === "REELS" ? "reel"
        : m.media_type === "CAROUSEL_ALBUM" ? "carousel"
        : m.media_type === "VIDEO" ? "video"
        : "image",
      caption: m.caption ?? "",
      thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
      permalink: m.permalink ?? null,
      publishedAt: m.timestamp,
      metrics: { reach: null, likes: m.like_count ?? null, comments: m.comments_count ?? null, saves: null, plays: null },
    }));
  }

  async syncComments(account: ConnectedAccount, mediaIds: string[]): Promise<Comment[]> {
    const token = await this.tokens.pageToken(account.id);
    const out: Comment[] = [];
    for (const mediaId of mediaIds) {
      const res = await listComments(this.client, mediaId, token);
      for (const c of res.data) {
        out.push({
          id: c.id,
          accountId: account.id,
          mediaId,
          mediaThumbnailUrl: null,
          username: c.username ?? c.from?.username ?? "unknown",
          text: c.text,
          createdAt: c.timestamp,
          replied: (c.replies?.data.length ?? 0) > 0,
          hidden: c.hidden ?? false,
        });
      }
    }
    return out;
  }

  async replyToComment(account: ConnectedAccount, commentId: string, text: string) {
    await replyToComment(this.client, commentId, await this.tokens.pageToken(account.id), text);
  }
  async hideComment(account: ConnectedAccount, commentId: string, hide: boolean) {
    await hideComment(this.client, commentId, await this.tokens.pageToken(account.id), hide);
  }
}

function toMessage(m: GraphMessage, selfIgUserId: string, conversationId: string): Message {
  const attachments: Message["attachments"] = [];
  for (const a of m.attachments?.data ?? []) {
    if (a.video_data) attachments.push({ kind: "video", url: a.video_data.url, permalink: null, thumbnailUrl: a.video_data.preview_url ?? null });
    else if (a.image_data) attachments.push({ kind: "image", url: a.image_data.url, permalink: null, thumbnailUrl: a.image_data.preview_url ?? null });
    else if (a.file_url && a.mime_type?.startsWith("audio/")) attachments.push({ kind: "audio", url: a.file_url, permalink: null, thumbnailUrl: null });
    else attachments.push({ kind: "unsupported", url: null, permalink: null, thumbnailUrl: null });
  }
  for (const s of m.shares?.data ?? []) {
    const link = s.link ?? null;
    const isReel = !!link && /\/reel\//.test(link);
    attachments.push({ kind: isReel ? "reel" : "post", url: null, permalink: link, thumbnailUrl: null });
  }
  return {
    id: m.id,
    conversationId,
    fromMe: m.from.id === selfIgUserId,
    text: m.message ?? null,
    attachments,
    reactions: (m.reactions?.data ?? []).map((r) => ({
      emoji: r.reaction,
      fromMe: r.users.data.some((u) => u.id === selfIgUserId),
    })),
    sentAt: m.created_time,
  };
}
