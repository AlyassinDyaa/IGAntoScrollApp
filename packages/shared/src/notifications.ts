import { z } from "zod";

export const NotificationKindSchema = z.enum([
  "new_dm",
  "sent_reel",
  "reaction",
  "comment",
  "mention",
  "publish_result",
]);
export type NotificationKind = z.infer<typeof NotificationKindSchema>;

export const QuietHoursSchema = z.object({
  enabled: z.boolean(),
  /** "HH:MM" 24h, local time. */
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  allowPriorityContacts: z.boolean(),
});
export type QuietHours = z.infer<typeof QuietHoursSchema>;

export const AccountNotificationPrefsSchema = z.object({
  accountId: z.string(),
  enabled: z.boolean(),
  kinds: z.record(NotificationKindSchema, z.boolean()),
});
export type AccountNotificationPrefs = z.infer<typeof AccountNotificationPrefsSchema>;

/** Payload delivered via Web Push. Deep link lands on the exact account + conversation. */
export const PushPayloadSchema = z.object({
  kind: NotificationKindSchema,
  title: z.string(),
  body: z.string(),
  accountId: z.string(),
  url: z.string(),
  badgeCount: z.number().int().min(0).optional(),
  tag: z.string().optional(),
});
export type PushPayload = z.infer<typeof PushPayloadSchema>;

export const PushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInputSchema>;
