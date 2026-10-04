import type { AudioTrack } from "@ig-focus-hub/shared";
import type { MetaClient, Paged } from "./client";

/**
 * Instagram Audio API (2026, Facebook Login route).
 *
 * Meta exposes original Reel sounds and music made available for third-party
 * publishing. The exact catalog depends on account, region, licensing and API
 * access, so results here are "supported audio", never "everything in Instagram".
 *
 * NOTE: Endpoint paths and field names below follow the published Audio API shape
 * at the time of writing. Verify against the current reference before go-live:
 * https://developers.facebook.com/docs/instagram-platform/ (Audio section) and
 * adjust AUDIO_EDGES if Meta renames anything. Behind MOCK_META the API serves fixtures.
 */
export const AUDIO_EDGES = {
  search: "audio_search",
  trending: "trending_audio",
  originals: "original_audio",
} as const;

interface GraphAudioNode {
  id: string;
  title?: string;
  display_artist?: string;
  artist_name?: string;
  duration_in_ms?: number;
  preview_url?: string;
  cover_artwork_uri?: string;
  is_original_audio?: boolean;
  audio_type?: string;
}

const AUDIO_FIELDS =
  "id,title,display_artist,artist_name,duration_in_ms,preview_url,cover_artwork_uri,is_original_audio,audio_type";

function toTrack(node: GraphAudioNode, fallback: AudioTrack["source"]): AudioTrack {
  const source: AudioTrack["source"] = node.is_original_audio
    ? "original"
    : node.audio_type === "MUSIC"
      ? "meta_music"
      : fallback;
  return {
    id: node.id,
    title: node.title ?? "Untitled audio",
    artist: node.display_artist ?? node.artist_name ?? null,
    durationSec: node.duration_in_ms ? Math.round(node.duration_in_ms / 1000) : null,
    source,
    previewUrl: node.preview_url ?? null,
    coverUrl: node.cover_artwork_uri ?? null,
  };
}

export async function searchAudio(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
  query: string,
): Promise<AudioTrack[]> {
  const res = await client.get<Paged<GraphAudioNode>>(
    `${igUserId}/${AUDIO_EDGES.search}`,
    { q: query, fields: AUDIO_FIELDS, limit: 25 },
    pageToken,
  );
  return res.data.map((n) => toTrack(n, "meta_music"));
}

export async function listTrendingAudio(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
): Promise<AudioTrack[]> {
  const res = await client.get<Paged<GraphAudioNode>>(
    `${igUserId}/${AUDIO_EDGES.trending}`,
    { fields: AUDIO_FIELDS, limit: 25 },
    pageToken,
  );
  return res.data.map((n) => toTrack(n, "trending"));
}

export async function listOriginalAudio(
  client: MetaClient,
  igUserId: string,
  pageToken: string,
): Promise<AudioTrack[]> {
  const res = await client.get<Paged<GraphAudioNode>>(
    `${igUserId}/${AUDIO_EDGES.originals}`,
    { fields: AUDIO_FIELDS, limit: 25 },
    pageToken,
  );
  return res.data.map((n) => toTrack(n, "original"));
}
