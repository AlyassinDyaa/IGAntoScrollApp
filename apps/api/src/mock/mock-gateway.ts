import type { AudioTrack, Comment, ConnectedAccount, Conversation, Draft, Message, OwnedMedia } from "@ig-focus-hub/shared";
import type { MetaGateway } from "../types.js";
import * as F from "./fixtures.js";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pretends to be Meta. Latency is simulated so loading states are visible in dev. */
export class MockGateway implements MetaGateway {
  async syncConversations(account: ConnectedAccount): Promise<Conversation[]> {
    await delay(120);
    return F.CONVERSATIONS.filter((c) => c.accountId === account.id);
  }
  async syncMessages(_account: ConnectedAccount, conversation: Conversation): Promise<Message[]> {
    await delay(80);
    return F.MESSAGES[conversation.id] ?? [];
  }
  async sendText(_account: ConnectedAccount, conversation: Conversation, text: string): Promise<Message> {
    await delay(150);
    return {
      id: `mock_${Date.now()}`,
      conversationId: conversation.id,
      fromMe: true,
      text,
      attachments: [],
      reactions: [],
      sentAt: new Date().toISOString(),
    };
  }
  async sendImage(_account: ConnectedAccount, conversation: Conversation, imageUrl: string, text: string): Promise<Message> {
    await delay(200);
    return {
      id: `mock_${Date.now()}`,
      conversationId: conversation.id,
      fromMe: true,
      text: text || null,
      attachments: [{ kind: "image", url: imageUrl, permalink: null, thumbnailUrl: imageUrl }],
      reactions: [],
      sentAt: new Date().toISOString(),
    };
  }
  async react(): Promise<void> { await delay(60); }

  async searchAudio(_account: ConnectedAccount, query: string): Promise<AudioTrack[]> {
    await delay(200);
    const q = query.toLowerCase();
    return F.AUDIO.filter((a) => a.title.toLowerCase().includes(q) || (a.artist ?? "").toLowerCase().includes(q));
  }
  async trendingAudio(): Promise<AudioTrack[]> { await delay(150); return F.AUDIO.filter((a) => a.source === "trending"); }
  async originalAudio(): Promise<AudioTrack[]> { await delay(150); return F.AUDIO.filter((a) => a.source === "original"); }

  async publish(_account: ConnectedAccount, draft: Draft): Promise<{ igMediaId: string; permalink: string | null }> {
    await delay(900);
    const id = `1789${Date.now()}`;
    const path = draft.type === "reel" ? "reel" : "p";
    return { igMediaId: id, permalink: `https://www.instagram.com/${path}/MOCK${id.slice(-6)}/` };
  }

  async syncOwnedMedia(account: ConnectedAccount): Promise<OwnedMedia[]> {
    await delay(100);
    return F.OWNED_MEDIA.filter((m) => m.accountId === account.id);
  }
  async syncComments(account: ConnectedAccount): Promise<Comment[]> {
    await delay(100);
    return F.COMMENTS.filter((c) => c.accountId === account.id);
  }
  async replyToComment(): Promise<void> { await delay(120); }
  async hideComment(): Promise<void> { await delay(80); }
}
