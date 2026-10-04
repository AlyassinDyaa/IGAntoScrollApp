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
import { DEFAULT_MEDIA_EDITS, MediaEditsSchema } from "@ig-focus-hub/shared";
import { decryptSecret, prisma, type Prisma } from "@ig-focus-hub/db";
import type { Store } from "../types.js";
import type { TokenResolver } from "./graph-gateway.js";

const iso = (d: Date) => d.toISOString();

/**
 * PostgreSQL-backed store for one owner. Comments and owned media are cached
 * locally from Graph syncs; conversations/messages are mirrored so the inbox
 * stays fast and finite.
 */
export class PrismaStore implements Store, TokenResolver {
  constructor(private readonly userId: string) {}

  // ----------------------------------------------------------- accounts ----
  async pageToken(accountId: string): Promise<string> {
    const a = await prisma.igAccount.findFirstOrThrow({ where: { id: accountId, userId: this.userId } });
    return decryptSecret(a.pageTokenEnc);
  }

  async listAccounts() {
    const rows = await prisma.igAccount.findMany({ where: { userId: this.userId }, orderBy: { connectedAt: "asc" } });
    return rows.map(toAccount);
  }
  async getAccount(id: string) {
    const row = await prisma.igAccount.findFirst({ where: { id, userId: this.userId } });
    return row ? toAccount(row) : null;
  }
  async updateAccount(id: string, patch: Partial<Pick<ConnectedAccount, "label" | "accent" | "status">>) {
    const row = await prisma.igAccount.update({ where: { id }, data: patch });
    return toAccount(row);
  }
  async removeAccount(id: string) {
    await prisma.igAccount.delete({ where: { id } });
  }

  // -------------------------------------------------------------- inbox ----
  async listConversations(filter: { accountId?: string; query?: string; needsReply?: boolean }) {
    const q = filter.query?.trim();
    const rows = await prisma.conversation.findMany({
      where: {
        account: { userId: this.userId },
        ...(filter.accountId ? { accountId: filter.accountId } : {}),
        ...(filter.needsReply !== undefined ? { needsReply: filter.needsReply } : {}),
        ...(q
          ? {
              OR: [
                { participantUser: { contains: q, mode: "insensitive" } },
                { participantName: { contains: q, mode: "insensitive" } },
                { lastMessagePreview: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
    return rows.map(toConversation);
  }
  async getConversation(id: string) {
    const row = await prisma.conversation.findFirst({ where: { id, account: { userId: this.userId } } });
    return row ? toConversation(row) : null;
  }
  async updateConversation(id: string, patch: Partial<Conversation> & { privateNote?: string | null }) {
    const row = await prisma.conversation.update({
      where: { id },
      data: {
        favorite: patch.favorite,
        mutedLocally: patch.mutedLocally,
        labels: patch.labels,
        priority: patch.priority,
        needsReply: patch.needsReply,
        unreadCount: patch.unreadCount,
        privateNote: patch.privateNote,
      },
    });
    return toConversation(row);
  }
  async getPrivateNote(conversationId: string) {
    const row = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { privateNote: true } });
    return row?.privateNote ?? null;
  }
  async listMessages(conversationId: string) {
    const rows = await prisma.message.findMany({ where: { conversationId }, orderBy: { sentAt: "asc" }, take: 200 });
    return rows.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      fromMe: m.fromMe,
      text: m.text,
      attachments: m.attachments as Message["attachments"],
      reactions: m.reactions as Message["reactions"],
      sentAt: iso(m.sentAt),
    }));
  }
  async appendMessage(message: Message) {
    await prisma.$transaction([
      prisma.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          conversationId: message.conversationId,
          fromMe: message.fromMe,
          text: message.text,
          attachments: message.attachments as unknown as Prisma.InputJsonValue,
          reactions: message.reactions as unknown as Prisma.InputJsonValue,
          sentAt: new Date(message.sentAt),
        },
        update: {},
      }),
      prisma.conversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessagePreview: message.text ?? "sent an attachment",
          lastMessageAt: new Date(message.sentAt),
          needsReply: !message.fromMe,
          unreadCount: message.fromMe ? 0 : { increment: 1 },
        },
      }),
    ]);
  }

  /** Mirror a Graph sync into the local inbox without losing local flags. */
  async upsertConversations(convs: Conversation[]) {
    for (const c of convs) {
      await prisma.conversation.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          accountId: c.accountId,
          participantIgsid: c.participant.igUserId,
          participantUser: c.participant.username,
          participantName: c.participant.name,
          participantAvatar: c.participant.avatarUrl,
          lastMessagePreview: c.lastMessagePreview,
          lastMessageAt: new Date(c.lastMessageAt),
          needsReply: c.needsReply,
        },
        update: {
          participantUser: c.participant.username,
          participantName: c.participant.name,
          lastMessagePreview: c.lastMessagePreview,
          lastMessageAt: new Date(c.lastMessageAt),
          needsReply: c.needsReply,
        },
      });
    }
  }

  async listSavedReplies() {
    return prisma.savedReply.findMany({ where: { userId: this.userId }, orderBy: { title: "asc" } });
  }
  async upsertSavedReply(reply: Omit<SavedReply, "id"> & { id?: string }) {
    if (reply.id) return prisma.savedReply.update({ where: { id: reply.id }, data: reply });
    return prisma.savedReply.create({ data: { ...reply, userId: this.userId } });
  }
  async deleteSavedReply(id: string) {
    await prisma.savedReply.delete({ where: { id } });
  }

  // --------------------------------------------------------- publishing ----
  async listDrafts() {
    const rows = await prisma.draft.findMany({ where: { userId: this.userId }, orderBy: { updatedAt: "desc" } });
    return rows.map(toDraft);
  }
  async getDraft(id: string) {
    const row = await prisma.draft.findFirst({ where: { id, userId: this.userId } });
    return row ? toDraft(row) : null;
  }
  async upsertDraft(draft: Omit<Draft, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const data = {
      accountId: draft.accountId,
      type: draft.type,
      caption: draft.caption,
      mediaAssetIds: draft.mediaAssetIds,
      edits: draft.edits as unknown as Prisma.InputJsonValue,
      audioTrackId: draft.audioTrackId,
      originalAudioTitle: draft.originalAudioTitle,
      shareToFeed: draft.shareToFeed,
      locationId: draft.locationId,
      userTags: draft.userTags as unknown as Prisma.InputJsonValue,
    };
    const row = draft.id
      ? await prisma.draft.update({ where: { id: draft.id }, data })
      : await prisma.draft.create({ data: { ...data, userId: this.userId } });
    return toDraft(row);
  }
  async deleteDraft(id: string) {
    await prisma.draft.delete({ where: { id } });
  }

  async listScheduled() {
    const rows = await prisma.scheduledPost.findMany({ where: { account: { userId: this.userId } }, orderBy: { publishAt: "asc" } });
    return rows.map(toScheduled);
  }
  async createScheduled(input: { draftId: string; accountId: string; publishAt: string }) {
    const row = await prisma.scheduledPost.create({ data: { ...input, publishAt: new Date(input.publishAt) } });
    return toScheduled(row);
  }
  async updateScheduled(id: string, patch: Partial<ScheduledPost>) {
    const row = await prisma.scheduledPost.update({
      where: { id },
      data: {
        status: patch.status,
        igMediaId: patch.igMediaId,
        permalink: patch.permalink,
        lastError: patch.lastError,
        ...(patch.publishAt ? { publishAt: new Date(patch.publishAt) } : {}),
      },
    });
    return toScheduled(row);
  }

  // ----------------------------------------------------------- business ----
  async listComments(filter: { accountId?: string; unansweredOnly?: boolean }) {
    const rows = await prisma.commentCache.findMany({
      where: {
        account: { userId: this.userId },
        ...(filter.accountId ? { accountId: filter.accountId } : {}),
        ...(filter.unansweredOnly ? { replied: false, hidden: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((c) => ({ ...c, mediaThumbnailUrl: c.mediaThumbnail, createdAt: iso(c.createdAt) }));
  }
  async updateComment(id: string, patch: Partial<Pick<Comment, "replied" | "hidden">>) {
    const c = await prisma.commentCache.update({ where: { id }, data: patch });
    return { ...c, mediaThumbnailUrl: c.mediaThumbnail, createdAt: iso(c.createdAt) };
  }
  async upsertComments(comments: Comment[]) {
    for (const c of comments) {
      await prisma.commentCache.upsert({
        where: { id: c.id },
        create: { id: c.id, accountId: c.accountId, mediaId: c.mediaId, mediaThumbnail: c.mediaThumbnailUrl, username: c.username, text: c.text, createdAt: new Date(c.createdAt), replied: c.replied, hidden: c.hidden },
        update: { text: c.text, replied: c.replied, hidden: c.hidden },
      });
    }
  }
  /** Owned media is not cached in Postgres yet; the route syncs it from Graph on demand. */
  async listOwnedMedia(): Promise<OwnedMedia[]> {
    return [];
  }
  async getDashboard(): Promise<Dashboard> {
    const accounts = await prisma.igAccount.findMany({ where: { userId: this.userId }, select: { id: true, label: true, accent: true } });
    const perAccount = await Promise.all(
      accounts.map(async (a) => {
        const [unread, needReply] = await Promise.all([
          prisma.conversation.aggregate({ where: { accountId: a.id }, _sum: { unreadCount: true } }),
          prisma.conversation.count({ where: { accountId: a.id, needsReply: true } }),
        ]);
        return { accountId: a.id, label: a.label, accent: a.accent, unreadDms: unread._sum.unreadCount ?? 0, needReply };
      }),
    );
    const [unansweredComments, scheduled] = await Promise.all([
      prisma.commentCache.count({ where: { account: { userId: this.userId }, replied: false, hidden: false } }),
      prisma.scheduledPost.count({ where: { account: { userId: this.userId }, status: "scheduled" } }),
    ]);
    return {
      unreadDms: perAccount.reduce((n, a) => n + a.unreadDms, 0),
      needReply: perAccount.reduce((n, a) => n + a.needReply, 0),
      unansweredComments,
      scheduled,
      accounts: perAccount,
    };
  }

  // ------------------------------------------------------ notifications ----
  async getQuietHours(): Promise<QuietHours> {
    const q = await prisma.quietHours.findUnique({ where: { userId: this.userId } });
    return q ?? { enabled: false, start: "22:00", end: "08:00", allowPriorityContacts: true };
  }
  async setQuietHours(q: QuietHours) {
    await prisma.quietHours.upsert({ where: { userId: this.userId }, create: { userId: this.userId, ...q }, update: q });
    return q;
  }
  async listNotificationPrefs() {
    const rows = await prisma.notificationPrefs.findMany({ where: { account: { userId: this.userId } } });
    return rows.map((r) => ({ accountId: r.accountId, enabled: r.enabled, kinds: r.kinds as AccountNotificationPrefs["kinds"] }));
  }
  async setNotificationPrefs(p: AccountNotificationPrefs) {
    await prisma.notificationPrefs.upsert({
      where: { accountId: p.accountId },
      create: { accountId: p.accountId, enabled: p.enabled, kinds: p.kinds as Prisma.InputJsonValue },
      update: { enabled: p.enabled, kinds: p.kinds as Prisma.InputJsonValue },
    });
    return p;
  }
  async addPushSubscription(sub: PushSubscriptionInput, userAgent: string | null) {
    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: { userId: this.userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
    });
  }
  async listPushSubscriptions() {
    const rows = await prisma.pushSubscription.findMany({ where: { userId: this.userId } });
    return rows.map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }));
  }
  async removePushSubscription(endpoint: string) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }
}

type AccountRow = Prisma.IgAccountGetPayload<Record<string, never>>;
type ConversationRow = Prisma.ConversationGetPayload<Record<string, never>>;
type DraftRow = Prisma.DraftGetPayload<Record<string, never>>;
type ScheduledRow = Prisma.ScheduledPostGetPayload<Record<string, never>>;

function toAccount(a: AccountRow): ConnectedAccount {
  return {
    id: a.id,
    igUserId: a.igUserId,
    pageId: a.pageId,
    username: a.username,
    displayName: a.displayName,
    label: a.label,
    accent: a.accent,
    avatarUrl: a.avatarUrl,
    connectedAt: iso(a.connectedAt),
    tokenExpiresAt: a.tokenExpiresAt ? iso(a.tokenExpiresAt) : null,
    status: a.status,
  };
}

function toConversation(c: ConversationRow): Conversation {
  return {
    id: c.id,
    accountId: c.accountId,
    participant: { igUserId: c.participantIgsid, username: c.participantUser, name: c.participantName, avatarUrl: c.participantAvatar },
    lastMessagePreview: c.lastMessagePreview,
    lastMessageAt: iso(c.lastMessageAt),
    unreadCount: c.unreadCount,
    needsReply: c.needsReply,
    favorite: c.favorite,
    mutedLocally: c.mutedLocally,
    labels: c.labels,
    priority: c.priority,
  };
}

function toDraft(d: DraftRow): Draft {
  const edits = MediaEditsSchema.safeParse(d.edits);
  return {
    id: d.id,
    accountId: d.accountId,
    type: d.type,
    caption: d.caption,
    mediaAssetIds: d.mediaAssetIds,
    edits: edits.success ? edits.data : DEFAULT_MEDIA_EDITS,
    audioTrackId: d.audioTrackId,
    originalAudioTitle: d.originalAudioTitle,
    shareToFeed: d.shareToFeed,
    locationId: d.locationId,
    userTags: d.userTags as Draft["userTags"],
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  };
}

function toScheduled(s: ScheduledRow): ScheduledPost {
  return {
    id: s.id,
    draftId: s.draftId,
    accountId: s.accountId,
    publishAt: iso(s.publishAt),
    status: s.status,
    igMediaId: s.igMediaId,
    permalink: s.permalink,
    lastError: s.lastError,
  };
}
