import type { MetaClient, Paged } from "./client";

export interface GraphMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: "FEED" | "REELS" | "STORY";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

/** Owned media only. This is the content library, never a feed of other accounts. */
export async function listOwnedMedia(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
  after?: string,
): Promise<Paged<GraphMedia>> {
  return client.get<Paged<GraphMedia>>(
    `${igUserId}/media`,
    {
      fields:
        "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      limit: 24,
      after,
    },
    pageToken,
  );
}

export interface GraphComment {
  id: string;
  text: string;
  timestamp: string;
  username?: string;
  from?: { id: string; username: string };
  hidden?: boolean;
  replies?: { data: { id: string }[] };
}

export async function listComments(
  client: MetaClient,
  mediaId: string,
  pageToken: string,
  after?: string,
): Promise<Paged<GraphComment>> {
  return client.get<Paged<GraphComment>>(
    `${mediaId}/comments`,
    { fields: "id,text,timestamp,username,from,hidden,replies{id}", limit: 50, after },
    pageToken,
  );
}

export async function replyToComment(
  client: MetaClient,
  commentId: string,
  pageToken: string,
  message: string,
): Promise<{ id: string }> {
  return client.post(`${commentId}/replies`, { message }, pageToken);
}

export async function hideComment(
  client: MetaClient,
  commentId: string,
  pageToken: string,
  hide: boolean,
): Promise<{ success: boolean }> {
  return client.post(commentId, { hide }, pageToken);
}

export interface InsightValue {
  name: string;
  period: string;
  values: { value: number }[];
}

export async function getMediaInsights(
  client: MetaClient,
  mediaId: string,
  pageToken: string,
  productType: "FEED" | "REELS",
): Promise<Paged<InsightValue>> {
  const metric =
    productType === "REELS"
      ? "plays,reach,likes,comments,saved,shares"
      : "reach,likes,comments,saved,shares";
  return client.get<Paged<InsightValue>>(`${mediaId}/insights`, { metric }, pageToken);
}
