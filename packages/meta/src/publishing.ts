import type { MetaClient } from "./client";

/**
 * Content Publishing API. Flow: create container(s) -> poll status -> publish.
 * Media must be reachable via public HTTPS URL (our object storage serves it).
 */

export interface CreateContainerBase {
  caption?: string;
  locationId?: string;
  userTags?: { username: string; x: number; y: number }[];
}

export interface ImageContainer extends CreateContainerBase {
  kind: "image";
  imageUrl: string;
  isCarouselItem?: boolean;
}

export interface ReelContainer extends CreateContainerBase {
  kind: "reel";
  videoUrl: string;
  coverUrl?: string;
  /** Seconds offset for cover frame, used when coverUrl is absent. */
  thumbOffsetMs?: number;
  shareToFeed?: boolean;
  /** Audio selected through the Instagram Audio API. */
  audioId?: string;
  /** Rename shown on the Reel's original audio. */
  audioName?: string;
}

export interface VideoCarouselItem extends CreateContainerBase {
  kind: "video_item";
  videoUrl: string;
}

export interface CarouselContainer extends CreateContainerBase {
  kind: "carousel";
  childrenIds: string[];
}

export type ContainerInput = ImageContainer | ReelContainer | VideoCarouselItem | CarouselContainer;

export async function createMediaContainer(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
  input: ContainerInput,
): Promise<{ id: string }> {
  const common = {
    caption: input.caption,
    location_id: input.locationId,
    user_tags: input.userTags ? JSON.stringify(input.userTags) : undefined,
  };
  switch (input.kind) {
    case "image":
      return client.post(
        `${igUserId}/media`,
        { ...common, image_url: input.imageUrl, is_carousel_item: input.isCarouselItem },
        pageToken,
      );
    case "reel":
      return client.post(
        `${igUserId}/media`,
        {
          ...common,
          media_type: "REELS",
          video_url: input.videoUrl,
          cover_url: input.coverUrl,
          thumb_offset: input.thumbOffsetMs,
          share_to_feed: input.shareToFeed,
          audio_id: input.audioId,
          audio_name: input.audioName,
        },
        pageToken,
      );
    case "video_item":
      return client.post(
        `${igUserId}/media`,
        { ...common, media_type: "VIDEO", video_url: input.videoUrl, is_carousel_item: true },
        pageToken,
      );
    case "carousel":
      return client.post(
        `${igUserId}/media`,
        { ...common, media_type: "CAROUSEL", children: input.childrenIds.join(",") },
        pageToken,
      );
  }
}

export type ContainerStatusCode = "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";

export async function getContainerStatus(
  client: MetaClient,
  containerId: string,
  pageToken: string,
): Promise<{ id: string; status_code: ContainerStatusCode; status?: string }> {
  return client.get(containerId, { fields: "status_code,status" }, pageToken);
}

export async function publishContainer(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
  creationId: string,
): Promise<{ id: string }> {
  return client.post(`${igUserId}/media_publish`, { creation_id: creationId }, pageToken);
}

export async function getPublishingLimit(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
): Promise<{ data: { quota_usage: number; config: { quota_total: number } }[] }> {
  return client.get(`${igUserId}/content_publishing_limit`, { fields: "quota_usage,config" }, pageToken);
}

export async function getMediaPermalink(
  client: MetaClient,
  mediaId: string,
  pageToken: string,
): Promise<{ id: string; permalink?: string }> {
  return client.get(mediaId, { fields: "id,permalink" }, pageToken);
}
