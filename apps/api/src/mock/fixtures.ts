import type {
  AudioTrack,
  Comment,
  ConnectedAccount,
  Conversation,
  Draft,
  Message,
  OwnedMedia,
  SavedReply,
  ScheduledPost,
} from "@ig-focus-hub/shared";
import { DEFAULT_MEDIA_EDITS } from "@ig-focus-hub/shared";

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursAhead = (h: number) => new Date(now + h * 3_600_000).toISOString();

export const ACCOUNTS: ConnectedAccount[] = [
  {
    id: "acc_personal",
    igUserId: "17841400000000001",
    pageId: "1000000000001",
    username: "dyaa.studio",
    displayName: "Dyaa Studio",
    label: "Personal",
    accent: "pink",
    avatarUrl: null,
    connectedAt: minutesAgo(60 * 24 * 12),
    tokenExpiresAt: null,
    status: "active",
  },
  {
    id: "acc_business",
    igUserId: "17841400000000002",
    pageId: "1000000000002",
    username: "yourbusiness",
    displayName: "Your Business",
    label: "Business",
    accent: "purple",
    avatarUrl: null,
    connectedAt: minutesAgo(60 * 24 * 9),
    tokenExpiresAt: null,
    status: "active",
  },
  {
    id: "acc_three",
    igUserId: "17841400000000003",
    pageId: "1000000000003",
    username: "account.three",
    displayName: "Account 3",
    label: "Account 3",
    accent: "orange",
    avatarUrl: null,
    connectedAt: minutesAgo(60 * 24 * 2),
    tokenExpiresAt: null,
    status: "active",
  },
];

export const CONVERSATIONS: Conversation[] = [
  {
    id: "t_john",
    accountId: "acc_personal",
    participant: { igUserId: "9001", username: "john.k", name: "John", avatarUrl: null },
    lastMessagePreview: "sent a Reel",
    lastMessageAt: minutesAgo(2),
    unreadCount: 1,
    needsReply: false,
    favorite: false,
    mutedLocally: false,
    labels: [],
    priority: true,
  },
  {
    id: "t_mohamed",
    accountId: "acc_business",
    participant: { igUserId: "9002", username: "mohamed.b", name: "Mohamed", avatarUrl: null },
    lastMessagePreview: "Are you around tomorrow?",
    lastMessageAt: minutesAgo(8),
    unreadCount: 2,
    needsReply: true,
    favorite: true,
    mutedLocally: false,
    labels: ["customer"],
    priority: false,
  },
  {
    id: "t_sarah",
    accountId: "acc_personal",
    participant: { igUserId: "9003", username: "sarah.m", name: "Sarah", avatarUrl: null },
    lastMessagePreview: "reacted ❤️ to your message",
    lastMessageAt: minutesAgo(14),
    unreadCount: 0,
    needsReply: false,
    favorite: false,
    mutedLocally: false,
    labels: [],
    priority: false,
  },
  {
    id: "t_customer42",
    accountId: "acc_business",
    participant: { igUserId: "9004", username: "customer_42", name: "Customer 42", avatarUrl: null },
    lastMessagePreview: "Custom order question",
    lastMessageAt: minutesAgo(25),
    unreadCount: 3,
    needsReply: true,
    favorite: false,
    mutedLocally: false,
    labels: ["lead", "follow_up"],
    priority: false,
  },
  {
    id: "t_lina",
    accountId: "acc_three",
    participant: { igUserId: "9005", username: "lina.design", name: "Lina", avatarUrl: null },
    lastMessagePreview: "Thanks, the invoice is paid",
    lastMessageAt: minutesAgo(190),
    unreadCount: 0,
    needsReply: false,
    favorite: false,
    mutedLocally: false,
    labels: ["completed"],
    priority: false,
  },
  {
    id: "t_omar",
    accountId: "acc_business",
    participant: { igUserId: "9006", username: "omar.ships", name: "Omar", avatarUrl: null },
    lastMessagePreview: "Can you ship to Dubai?",
    lastMessageAt: minutesAgo(60 * 7),
    unreadCount: 0,
    needsReply: true,
    favorite: false,
    mutedLocally: false,
    labels: ["quote_sent"],
    priority: false,
  },
];

export const MESSAGES: Record<string, Message[]> = {
  t_john: [
    { id: "m1", conversationId: "t_john", fromMe: true, text: "Did you see the new drop?", attachments: [], reactions: [], sentAt: minutesAgo(40) },
    {
      id: "m2",
      conversationId: "t_john",
      fromMe: false,
      text: null,
      attachments: [
        {
          kind: "reel",
          url: null,
          permalink: "https://www.instagram.com/reel/C0000000000/",
          thumbnailUrl: null,
        },
      ],
      reactions: [],
      sentAt: minutesAgo(2),
    },
  ],
  t_mohamed: [
    { id: "m3", conversationId: "t_mohamed", fromMe: false, text: "Hi! Is the blue hoodie still available in M?", attachments: [], reactions: [], sentAt: minutesAgo(30) },
    { id: "m4", conversationId: "t_mohamed", fromMe: true, text: "Yes, two left. Want me to hold one?", attachments: [], reactions: [{ emoji: "❤️", fromMe: false }], sentAt: minutesAgo(20) },
    { id: "m5", conversationId: "t_mohamed", fromMe: false, text: "Please do.", attachments: [], reactions: [], sentAt: minutesAgo(9) },
    { id: "m6", conversationId: "t_mohamed", fromMe: false, text: "Are you around tomorrow?", attachments: [], reactions: [], sentAt: minutesAgo(8) },
  ],
  t_sarah: [
    { id: "m7", conversationId: "t_sarah", fromMe: true, text: "Sent you the final files 🙌", attachments: [], reactions: [{ emoji: "❤️", fromMe: false }], sentAt: minutesAgo(15) },
  ],
  t_customer42: [
    { id: "m8", conversationId: "t_customer42", fromMe: false, text: "Hello, can I get a custom print with my logo?", attachments: [], reactions: [], sentAt: minutesAgo(50) },
    { id: "m9", conversationId: "t_customer42", fromMe: false, text: "Around 30 pieces", attachments: [], reactions: [], sentAt: minutesAgo(49) },
    { id: "m10", conversationId: "t_customer42", fromMe: false, text: "Custom order question", attachments: [], reactions: [], sentAt: minutesAgo(25) },
  ],
  t_lina: [
    { id: "m11", conversationId: "t_lina", fromMe: false, text: "Thanks, the invoice is paid", attachments: [], reactions: [{ emoji: "🙌", fromMe: true }], sentAt: minutesAgo(190) },
  ],
  t_omar: [
    { id: "m12", conversationId: "t_omar", fromMe: false, text: "Can you ship to Dubai?", attachments: [], reactions: [], sentAt: minutesAgo(60 * 7) },
  ],
};

export const SAVED_REPLIES: SavedReply[] = [
  { id: "sr1", title: "Pricing", body: "Thanks for reaching out! Our prices start at $25. Which item are you interested in?", shortcut: "/price" },
  { id: "sr2", title: "Shipping", body: "We ship worldwide. Local delivery takes 2-3 days, international 7-12 days.", shortcut: "/ship" },
  { id: "sr3", title: "Order update", body: "Your order is being prepared and you'll get a tracking number as soon as it ships.", shortcut: "/update" },
  { id: "sr4", title: "Custom work", body: "We do custom pieces! Send me the design and quantity and I'll quote you within 24h.", shortcut: "/custom" },
];

export const DRAFTS: Draft[] = [
  {
    id: "d1",
    accountId: "acc_business",
    type: "reel",
    caption: "New product available 🔥\n#smallbusiness #handmade",
    mediaAssetIds: [],
    edits: DEFAULT_MEDIA_EDITS,
    audioTrackId: null,
    originalAudioTitle: null,
    shareToFeed: true,
    locationId: null,
    userTags: [],
    createdAt: minutesAgo(60 * 5),
    updatedAt: minutesAgo(60 * 3),
  },
  {
    id: "d2",
    accountId: "acc_personal",
    type: "carousel",
    caption: "Studio week in five frames",
    mediaAssetIds: [],
    edits: DEFAULT_MEDIA_EDITS,
    audioTrackId: null,
    originalAudioTitle: null,
    shareToFeed: true,
    locationId: null,
    userTags: [],
    createdAt: minutesAgo(60 * 30),
    updatedAt: minutesAgo(60 * 26),
  },
];

export const SCHEDULED: ScheduledPost[] = [
  { id: "s1", draftId: "d1", accountId: "acc_business", publishAt: hoursAhead(5), status: "scheduled", igMediaId: null, permalink: null, lastError: null },
  { id: "s2", draftId: "d2", accountId: "acc_personal", publishAt: hoursAhead(28), status: "scheduled", igMediaId: null, permalink: null, lastError: null },
];

export const OWNED_MEDIA: OwnedMedia[] = [
  {
    id: "om1",
    accountId: "acc_business",
    type: "reel",
    caption: "Behind the scenes of the spring collection",
    thumbnailUrl: null,
    permalink: "https://www.instagram.com/reel/C0000000001/",
    publishedAt: minutesAgo(60 * 24 * 2),
    metrics: { reach: 4820, likes: 312, comments: 24, saves: 58, plays: 6210 },
  },
  {
    id: "om2",
    accountId: "acc_business",
    type: "carousel",
    caption: "Three ways to style the linen set",
    thumbnailUrl: null,
    permalink: "https://www.instagram.com/p/C0000000002/",
    publishedAt: minutesAgo(60 * 24 * 5),
    metrics: { reach: 2210, likes: 180, comments: 9, saves: 41, plays: null },
  },
  {
    id: "om3",
    accountId: "acc_personal",
    type: "image",
    caption: "Morning light in the studio",
    thumbnailUrl: null,
    permalink: "https://www.instagram.com/p/C0000000003/",
    publishedAt: minutesAgo(60 * 24 * 8),
    metrics: { reach: 980, likes: 143, comments: 6, saves: 12, plays: null },
  },
];

export const COMMENTS: Comment[] = [
  { id: "c1", accountId: "acc_business", mediaId: "om1", mediaThumbnailUrl: null, username: "nora.v", text: "Do you ship to Canada?", createdAt: minutesAgo(35), replied: false, hidden: false },
  { id: "c2", accountId: "acc_business", mediaId: "om1", mediaThumbnailUrl: null, username: "k.alex", text: "Love this 😍", createdAt: minutesAgo(70), replied: false, hidden: false },
  { id: "c3", accountId: "acc_business", mediaId: "om2", mediaThumbnailUrl: null, username: "maya_s", text: "What size is the model wearing?", createdAt: minutesAgo(60 * 3), replied: false, hidden: false },
  { id: "c4", accountId: "acc_personal", mediaId: "om3", mediaThumbnailUrl: null, username: "tom.r", text: "Beautiful light!", createdAt: minutesAgo(60 * 9), replied: true, hidden: false },
  { id: "c5", accountId: "acc_business", mediaId: "om2", mediaThumbnailUrl: null, username: "spam.bot", text: "Check my page for cheap followers", createdAt: minutesAgo(60 * 12), replied: false, hidden: true },
  { id: "c6", accountId: "acc_business", mediaId: "om1", mediaThumbnailUrl: null, username: "farah.o", text: "Is the hoodie unisex?", createdAt: minutesAgo(60 * 20), replied: false, hidden: false },
  { id: "c7", accountId: "acc_business", mediaId: "om1", mediaThumbnailUrl: null, username: "jay", text: "Price?", createdAt: minutesAgo(60 * 26), replied: false, hidden: false },
];

export const AUDIO: AudioTrack[] = [
  { id: "a1", title: "Golden Hour Walk", artist: "Reel Originals", durationSec: 30, source: "trending", previewUrl: null, coverUrl: null },
  { id: "a2", title: "Soft Focus", artist: "Meta Sound Collection", durationSec: 45, source: "meta_music", previewUrl: null, coverUrl: null },
  { id: "a3", title: "Original audio - dyaa.studio", artist: "dyaa.studio", durationSec: 22, source: "original", previewUrl: null, coverUrl: null },
  { id: "a4", title: "Market Morning", artist: "Meta Sound Collection", durationSec: 60, source: "meta_music", previewUrl: null, coverUrl: null },
  { id: "a5", title: "Stitch & Thread", artist: "yourbusiness", durationSec: 18, source: "original", previewUrl: null, coverUrl: null },
  { id: "a6", title: "Upbeat Unboxing", artist: "Reel Originals", durationSec: 15, source: "trending", previewUrl: null, coverUrl: null },
];
