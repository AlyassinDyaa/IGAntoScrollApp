import { z } from "zod";

/** The Business screen answers four questions immediately. Nothing else. */
export const DashboardSchema = z.object({
  unreadDms: z.number().int().min(0),
  needReply: z.number().int().min(0),
  unansweredComments: z.number().int().min(0),
  scheduled: z.number().int().min(0),
  accounts: z.array(
    z.object({
      accountId: z.string(),
      label: z.string(),
      accent: z.string(),
      unreadDms: z.number().int().min(0),
      needReply: z.number().int().min(0),
    }),
  ),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const CommentSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  mediaId: z.string(),
  mediaThumbnailUrl: z.string().url().nullable(),
  username: z.string(),
  text: z.string(),
  createdAt: z.string().datetime(),
  replied: z.boolean(),
  hidden: z.boolean(),
});
export type Comment = z.infer<typeof CommentSchema>;

export const OwnedMediaSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  type: z.enum(["image", "video", "reel", "carousel"]),
  caption: z.string(),
  thumbnailUrl: z.string().url().nullable(),
  permalink: z.string().url().nullable(),
  publishedAt: z.string().datetime(),
  metrics: z.object({
    reach: z.number().nullable(),
    likes: z.number().nullable(),
    comments: z.number().nullable(),
    saves: z.number().nullable(),
    plays: z.number().nullable(),
  }),
});
export type OwnedMedia = z.infer<typeof OwnedMediaSchema>;
