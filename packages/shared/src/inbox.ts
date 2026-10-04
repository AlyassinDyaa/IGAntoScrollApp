import { z } from "zod";

export const CrmLabelSchema = z.enum([
  "lead",
  "customer",
  "quote_sent",
  "waiting_for_customer",
  "order_issue",
  "follow_up",
  "completed",
]);
export type CrmLabel = z.infer<typeof CrmLabelSchema>;

export const CRM_LABEL_TEXT: Record<CrmLabel, string> = {
  lead: "Lead",
  customer: "Customer",
  quote_sent: "Quote sent",
  waiting_for_customer: "Waiting for customer",
  order_issue: "Order issue",
  follow_up: "Follow-up",
  completed: "Completed",
};

/** Attachment kinds we render. A shared Reel opens the sent-Reel-only viewer. */
export const AttachmentSchema = z.object({
  kind: z.enum(["image", "video", "audio", "reel", "post", "story_mention", "unsupported"]),
  url: z.string().url().nullable(),
  /** Exact permalink Meta returned; used as fallback when no playable media is exposed. */
  permalink: z.string().url().nullable(),
  thumbnailUrl: z.string().url().nullable(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  fromMe: z.boolean(),
  text: z.string().nullable(),
  attachments: z.array(AttachmentSchema),
  reactions: z.array(z.object({ emoji: z.string(), fromMe: z.boolean() })),
  sentAt: z.string().datetime(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  participant: z.object({
    igUserId: z.string(),
    username: z.string(),
    name: z.string().nullable(),
    avatarUrl: z.string().url().nullable(),
  }),
  lastMessagePreview: z.string(),
  lastMessageAt: z.string().datetime(),
  unreadCount: z.number().int().min(0),
  needsReply: z.boolean(),
  favorite: z.boolean(),
  mutedLocally: z.boolean(),
  labels: z.array(CrmLabelSchema),
  /** Priority contacts always surface, even during quiet hours. */
  priority: z.boolean(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const SendMessageInputSchema = z.object({
  accountId: z.string(),
  conversationId: z.string(),
  text: z.string().min(1).max(1000),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const ReactInputSchema = z.object({
  accountId: z.string(),
  messageId: z.string(),
  emoji: z.string().min(1).max(8),
  action: z.enum(["react", "unreact"]),
});
export type ReactInput = z.infer<typeof ReactInputSchema>;

export const SavedReplySchema = z.object({
  id: z.string(),
  title: z.string().max(60),
  body: z.string().max(1000),
  shortcut: z.string().max(16).nullable(),
});
export type SavedReply = z.infer<typeof SavedReplySchema>;
