import type {
  AccountNotificationPrefs,
  Comment,
  ConnectedAccount,
  Conversation,
  Dashboard,
  Draft,
  Message,
  OwnedMedia,
  PushSubscriptionInput,
  QuietHours,
  SavedReply,
  ScheduledPost,
} from "@ig-focus-hub/shared";
import type { Store } from "../types.js";
import * as F from "./fixtures.js";

const clone = <T>(v: T): T => structuredClone(v);
const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

/** In-memory store used when MOCK_META=1. Resets on restart by design. */
export class MemoryStore implements Store {
  private accounts = clone(F.ACCOUNTS);
  private conversations = clone(F.CONVERSATIONS);
  private notes = new Map<string, string>([["t_customer42", "Wants 30 custom prints with logo. Send quote by Friday."]]);
  private messages = clone(F.MESSAGES);
  private savedReplies = clone(F.SAVED_REPLIES);
  private drafts = clone(F.DRAFTS);
  private scheduled = clone(F.SCHEDULED);
  private comments = clone(F.COMMENTS);
  private ownedMedia = clone(F.OWNED_MEDIA);
  private quietHours: QuietHours = { enabled: true, start: "22:00", end: "08:00", allowPriorityContacts: true };
  private prefs = new Map<string, AccountNotificationPrefs>(
    F.ACCOUNTS.map((a) => [
      a.id,
      {
        accountId: a.id,
        enabled: true,
        kinds: { new_dm: true, sent_reel: true, reaction: a.id !== "acc_three", comment: true, mention: true, publish_result: true },
      },
    ]),
  );
  private pushSubs = new Map<string, PushSubscriptionInput>();

  async listAccounts() { return clone(this.accounts); }
  async getAccount(id: string) { return clone(this.accounts.find((a) => a.id === id) ?? null); }
  async updateAccount(id: string, patch: Partial<ConnectedAccount>) {
    const a = this.accounts.find((x) => x.id === id);
    if (!a) throw new Error("Account not found");
    Object.assign(a, patch);
    return clone(a);
  }
  async removeAccount(id: string) {
    this.accounts = this.accounts.filter((a) => a.id !== id);
    this.conversations = this.conversations.filter((c) => c.accountId !== id);
  }

  async listConversations(filter: { accountId?: string; query?: string; needsReply?: boolean }) {
    const q = filter.query?.trim().toLowerCase();
    return clone(
      this.conversations
        .filter((c) => !filter.accountId || c.accountId === filter.accountId)
        .filter((c) => filter.needsReply === undefined || c.needsReply === filter.needsReply)
        .filter(
          (c) =>
            !q ||
            c.participant.username.toLowerCase().includes(q) ||
            (c.participant.name ?? "").toLowerCase().includes(q) ||
            c.lastMessagePreview.toLowerCase().includes(q),
        )
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    );
  }
  async getConversation(id: string) { return clone(this.conversations.find((c) => c.id === id) ?? null); }
  async updateConversation(id: string, patch: Partial<Conversation> & { privateNote?: string | null }) {
    const c = this.conversations.find((x) => x.id === id);
    if (!c) throw new Error("Conversation not found");
    const { privateNote, ...rest } = patch;
    Object.assign(c, rest);
    if (privateNote !== undefined) {
      if (privateNote) this.notes.set(id, privateNote);
      else this.notes.delete(id);
    }
    return clone(c);
  }
  async getPrivateNote(conversationId: string) { return this.notes.get(conversationId) ?? null; }
  async listMessages(conversationId: string) {
    return clone((this.messages[conversationId] ?? []).sort((a, b) => a.sentAt.localeCompare(b.sentAt)));
  }
  async appendMessage(message: Message) {
    (this.messages[message.conversationId] ??= []).push(clone(message));
    const c = this.conversations.find((x) => x.id === message.conversationId);
    if (c) {
      c.lastMessagePreview = message.text ?? "sent an attachment";
      c.lastMessageAt = message.sentAt;
      if (message.fromMe) { c.needsReply = false; c.unreadCount = 0; }
      else { c.needsReply = true; c.unreadCount += 1; }
    }
  }

  async listSavedReplies() { return clone(this.savedReplies); }
  async upsertSavedReply(reply: Omit<SavedReply, "id"> & { id?: string }) {
    const existing = reply.id ? this.savedReplies.find((r) => r.id === reply.id) : undefined;
    if (existing) { Object.assign(existing, reply); return clone(existing); }
    const created: SavedReply = { ...reply, id: newId("sr") };
    this.savedReplies.push(created);
    return clone(created);
  }
  async deleteSavedReply(id: string) { this.savedReplies = this.savedReplies.filter((r) => r.id !== id); }

  async listDrafts() { return clone([...this.drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); }
  async getDraft(id: string) { return clone(this.drafts.find((d) => d.id === id) ?? null); }
  async upsertDraft(draft: Omit<Draft, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const nowIso = new Date().toISOString();
    const existing = draft.id ? this.drafts.find((d) => d.id === draft.id) : undefined;
    if (existing) { Object.assign(existing, draft, { updatedAt: nowIso }); return clone(existing); }
    const created: Draft = { ...draft, id: newId("d"), createdAt: nowIso, updatedAt: nowIso };
    this.drafts.push(created);
    return clone(created);
  }
  async deleteDraft(id: string) { this.drafts = this.drafts.filter((d) => d.id !== id); }

  async listScheduled() { return clone([...this.scheduled].sort((a, b) => a.publishAt.localeCompare(b.publishAt))); }
  async createScheduled(input: { draftId: string; accountId: string; publishAt: string }) {
    const created: ScheduledPost = { id: newId("s"), ...input, status: "scheduled", igMediaId: null, permalink: null, lastError: null };
    this.scheduled.push(created);
    return clone(created);
  }
  async updateScheduled(id: string, patch: Partial<ScheduledPost>) {
    const s = this.scheduled.find((x) => x.id === id);
    if (!s) throw new Error("Scheduled post not found");
    Object.assign(s, patch);
    return clone(s);
  }

  async listComments(filter: { accountId?: string; unansweredOnly?: boolean }) {
    return clone(
      this.comments
        .filter((c) => !filter.accountId || c.accountId === filter.accountId)
        .filter((c) => !filter.unansweredOnly || (!c.replied && !c.hidden))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
  async updateComment(id: string, patch: Partial<Comment>) {
    const c = this.comments.find((x) => x.id === id);
    if (!c) throw new Error("Comment not found");
    Object.assign(c, patch);
    return clone(c);
  }
  async listOwnedMedia(accountId?: string) {
    return clone(this.ownedMedia.filter((m) => !accountId || m.accountId === accountId));
  }
  async getDashboard(): Promise<Dashboard> {
    const perAccount = this.accounts.map((a) => {
      const convs = this.conversations.filter((c) => c.accountId === a.id);
      return {
        accountId: a.id,
        label: a.label,
        accent: a.accent,
        unreadDms: convs.reduce((n, c) => n + c.unreadCount, 0),
        needReply: convs.filter((c) => c.needsReply).length,
      };
    });
    return {
      unreadDms: perAccount.reduce((n, a) => n + a.unreadDms, 0),
      needReply: perAccount.reduce((n, a) => n + a.needReply, 0),
      unansweredComments: this.comments.filter((c) => !c.replied && !c.hidden).length,
      scheduled: this.scheduled.filter((s) => s.status === "scheduled").length,
      accounts: perAccount,
    };
  }

  async getQuietHours() { return clone(this.quietHours); }
  async setQuietHours(q: QuietHours) { this.quietHours = clone(q); return clone(q); }
  async listNotificationPrefs() { return clone([...this.prefs.values()]); }
  async setNotificationPrefs(p: AccountNotificationPrefs) { this.prefs.set(p.accountId, clone(p)); return clone(p); }
  async addPushSubscription(sub: PushSubscriptionInput) { this.pushSubs.set(sub.endpoint, clone(sub)); }
  async listPushSubscriptions() { return clone([...this.pushSubs.values()]); }
  async removePushSubscription(endpoint: string) { this.pushSubs.delete(endpoint); }
}
