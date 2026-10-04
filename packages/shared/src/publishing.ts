import { z } from "zod";

export const PostTypeSchema = z.enum(["image", "video", "reel", "carousel"]);
export type PostType = z.infer<typeof PostTypeSchema>;

/** Instagram-supported aspect presets for the built-in crop tool. */
export const ASPECT_PRESETS = [
  { id: "1:1", label: "Square", ratio: 1 },
  { id: "4:5", label: "Portrait", ratio: 4 / 5 },
  { id: "9:16", label: "Reel", ratio: 9 / 16 },
  { id: "1.91:1", label: "Landscape", ratio: 1.91 },
] as const;
export type AspectPresetId = (typeof ASPECT_PRESETS)[number]["id"];

export const MediaEditsSchema = z.object({
  trimStartSec: z.number().min(0).nullable(),
  trimEndSec: z.number().min(0).nullable(),
  aspect: z.enum(["1:1", "4:5", "9:16", "1.91:1"]).nullable(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  /** 0-1. Original video track volume. */
  originalVolume: z.number().min(0).max(1),
  /** 0-1. Attached audio track volume. */
  audioVolume: z.number().min(0).max(1),
  textOverlays: z.array(
    z.object({
      text: z.string().max(120),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      size: z.enum(["s", "m", "l"]),
      color: z.string(),
    }),
  ),
  coverTimeSec: z.number().min(0).nullable(),
  coverAssetId: z.string().nullable(),
});
export type MediaEdits = z.infer<typeof MediaEditsSchema>;

export const DEFAULT_MEDIA_EDITS: MediaEdits = {
  trimStartSec: null,
  trimEndSec: null,
  aspect: null,
  rotation: 0,
  originalVolume: 1,
  audioVolume: 1,
  textOverlays: [],
  coverTimeSec: null,
  coverAssetId: null,
};

/**
 * Audio selectable through the Instagram Audio API (Facebook Login route).
 * Availability depends on account, region, licensing and API access, so the UI
 * must never promise the full in-app catalog.
 */
export const AudioTrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string().nullable(),
  durationSec: z.number().nullable(),
  source: z.enum(["trending", "original", "meta_music"]),
  previewUrl: z.string().url().nullable(),
  coverUrl: z.string().url().nullable(),
});
export type AudioTrack = z.infer<typeof AudioTrackSchema>;

export const DraftSchema = z.object({
  id: z.string(),
  accountId: z.string().nullable(),
  type: PostTypeSchema,
  caption: z.string().max(2200),
  mediaAssetIds: z.array(z.string()).max(10),
  edits: MediaEditsSchema,
  audioTrackId: z.string().nullable(),
  /** Rename shown on a Reel's original audio. */
  originalAudioTitle: z.string().max(80).nullable(),
  shareToFeed: z.boolean(),
  locationId: z.string().nullable(),
  userTags: z.array(z.object({ username: z.string(), x: z.number(), y: z.number() })),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Draft = z.infer<typeof DraftSchema>;

export const ScheduleStatusSchema = z.enum([
  "scheduled",
  "uploading",
  "processing",
  "published",
  "failed",
  "cancelled",
]);
export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>;

export const ScheduledPostSchema = z.object({
  id: z.string(),
  draftId: z.string(),
  accountId: z.string(),
  publishAt: z.string().datetime(),
  status: ScheduleStatusSchema,
  igMediaId: z.string().nullable(),
  permalink: z.string().url().nullable(),
  lastError: z.string().nullable(),
});
export type ScheduledPost = z.infer<typeof ScheduledPostSchema>;

export const PublishRequestSchema = z.object({
  draftId: z.string(),
  accountId: z.string(),
  /** Omit to publish now. */
  publishAt: z.string().datetime().optional(),
});
export type PublishRequest = z.infer<typeof PublishRequestSchema>;

/** Meta publishing limits we enforce before calling the API. */
export const PUBLISH_LIMITS = {
  carouselMinItems: 2,
  carouselMaxItems: 10,
  captionMaxChars: 2200,
  hashtagMax: 30,
  reelMaxDurationSec: 90,
  reelMinDurationSec: 3,
  postsPer24h: 50,
} as const;
