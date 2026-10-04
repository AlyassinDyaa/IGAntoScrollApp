import type {
  AudioTrack,
  Comment,
  ConnectedAccount,
  Conversation,
  Dashboard,
  Draft,
  Message,
  OwnedMedia,
  SavedReply,
  ScheduledPost,
  QuietHours,
  AccountNotificationPrefs,
  PushSubscriptionInput,
} from "@ig-focus-hub/shared";

/** Owner-scoped persistence. MemoryStore serves mock mode; PrismaStore serves real mode. */
export interface Store {
  listAccounts(): Promise<ConnectedAccount[]>;
  getAccount(id: string): Promise<ConnectedAccount | null>;
  updateAccount(id: string, patch: Partial<Pick<ConnectedAccount, "label" | "accent" | "status">>): Promise<ConnectedAccount>;
  removeAccount(id: string): Promise<void>;

  listConversations(filter: { accountId?: string; query?: string; needsReply?: boolean }): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  updateConversation(
    id: string,
    patch: Partial<Pick<Conversation, "favorite" | "mutedLocally" | "labels" | "priority" | "needsReply" | "unreadCount">> & {
      privateNote?: string | null;
    },
  ): Promise<Conversation>;
  getPrivateNote(conversationId: string): Promise<string | null>;
  listMessages(conversationId: string): Promise<Message[]>;
  appendMessage(message: Message): Promise<void>;

  listSavedReplies(): Promise<SavedReply[]>;
  upsertSavedReply(reply: Omit<SavedReply, "id"> & { id?: string }): Promise<SavedReply>;
  deleteSavedReply(id: string): Promise<void>;

  listDrafts(): Promise<Draft[]>;
  getDraft(id: string): Promise<Draft | null>;
  upsertDraft(draft: Omit<Draft, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Draft>;
  deleteDraft(id: string): Promise<void>;

  listScheduled(): Promise<ScheduledPost[]>;
  createScheduled(input: { draftId: string; accountId: string; publishAt: string }): Promise<ScheduledPost>;
  updateScheduled(id: string, patch: Partial<ScheduledPost>): Promise<ScheduledPost>;

  listComments(filter: { accountId?: string; unansweredOnly?: boolean }): Promise<Comment[]>;
  updateComment(id: string, patch: Partial<Pick<Comment, "replied" | "hidden">>): Promise<Comment>;
  listOwnedMedia(accountId?: string): Promise<OwnedMedia[]>;
  getDashboard(): Promise<Dashboard>;

  getQuietHours(): Promise<QuietHours>;
  setQuietHours(q: QuietHours): Promise<QuietHours>;
  listNotificationPrefs(): Promise<AccountNotificationPrefs[]>;
  setNotificationPrefs(p: AccountNotificationPrefs): Promise<AccountNotificationPrefs>;
  addPushSubscription(sub: PushSubscriptionInput, userAgent: string | null): Promise<void>;
  listPushSubscriptions(): Promise<PushSubscriptionInput[]>;
  removePushSubscription(endpoint: string): Promise<void>;
}

/** Everything that talks to Meta. GraphGateway hits the Graph API; MockGateway returns fixtures. */
export interface MetaGateway {
  syncConversations(account: ConnectedAccount): Promise<Conversation[]>;
  syncMessages(account: ConnectedAccount, conversation: Conversation): Promise<Message[]>;
  sendText(account: ConnectedAccount, conversation: Conversation, text: string): Promise<Message>;
  react(account: ConnectedAccount, conversation: Conversation, messageId: string, emoji: string, action: "react" | "unreact"): Promise<void>;

  searchAudio(account: ConnectedAccount, query: string): Promise<AudioTrack[]>;
  trendingAudio(account: ConnectedAccount): Promise<AudioTrack[]>;
  originalAudio(account: ConnectedAccount): Promise<AudioTrack[]>;

  publish(account: ConnectedAccount, draft: Draft, mediaUrls: string[]): Promise<{ igMediaId: string; permalink: string | null }>;

  syncOwnedMedia(account: ConnectedAccount): Promise<OwnedMedia[]>;
  syncComments(account: ConnectedAccount, mediaIds: string[]): Promise<Comment[]>;
  replyToComment(account: ConnectedAccount, commentId: string, text: string): Promise<void>;
  hideComment(account: ConnectedAccount, commentId: string, hide: boolean): Promise<void>;
}
