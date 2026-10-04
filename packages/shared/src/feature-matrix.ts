/**
 * Feature availability matrix (spec section 10).
 * The UI reads this to label capabilities honestly instead of pretending
 * unsupported actions exist.
 */
export type Availability = "ready" | "custom" | "meta_dependent" | "not_available";

export interface FeatureAvailability {
  key: string;
  capability: string;
  description: string;
  status: Availability;
}

export const FEATURE_MATRIX: FeatureAvailability[] = [
  { key: "dm", capability: "1:1 DMs", description: "Read/reply through supported Instagram messaging APIs.", status: "ready" },
  { key: "dm_reactions", capability: "DM reactions", description: "React/unreact where supported.", status: "ready" },
  { key: "sent_reel", capability: "Sent Reel message", description: "Display shared content and open the exact Reel.", status: "meta_dependent" },
  { key: "reel_playback", capability: "Direct Reel playback", description: "Use direct media URL only when Meta exposes it.", status: "meta_dependent" },
  { key: "group_dm", capability: "Group DMs", description: "Not supported.", status: "not_available" },
  { key: "new_dm", capability: "Arbitrary new DMs", description: "May be restricted by Meta conversation rules.", status: "meta_dependent" },
  { key: "push", capability: "Push notifications", description: "PWA Web Push + backend webhook events.", status: "custom" },
  { key: "accounts", capability: "Three accounts", description: "Separate tokens/account identities in one hub.", status: "custom" },
  { key: "publish_media", capability: "Publish photo/video", description: "Publish owned media through Meta where authorized.", status: "ready" },
  { key: "publish_reel", capability: "Publish Reels", description: "Publish supported Reel media.", status: "ready" },
  { key: "carousel", capability: "Carousel publishing", description: "Supported within platform limits.", status: "ready" },
  { key: "schedule", capability: "Scheduling", description: "Our server schedules the publish call.", status: "custom" },
  { key: "audio", capability: "Instagram audio", description: "Search/select supported audio via the Instagram Audio API. Catalog depends on account, region and licensing.", status: "meta_dependent" },
  { key: "music_full", capability: "Full IG music picker", description: "Instagram's entire licensed catalog is not promised.", status: "not_available" },
  { key: "editing", capability: "Basic editing", description: "Trim/crop/text/cover/volume implemented by us.", status: "custom" },
  { key: "comments", capability: "Comments", description: "Read/reply/manage where supported.", status: "ready" },
  { key: "insights", capability: "Insights", description: "Display metrics Meta exposes for professional accounts.", status: "ready" },
  { key: "stories", capability: "Stories", description: "Depends on account, authentication and API route.", status: "meta_dependent" },
  { key: "ads", capability: "Ads manager", description: "Out of scope for the initial app.", status: "not_available" },
];

export const AVAILABILITY_TEXT: Record<Availability, string> = {
  ready: "Ready",
  custom: "Custom",
  meta_dependent: "Meta-dependent",
  not_available: "Not available",
};

/**
 * Anti-doomscrolling rules (spec section 9). Encoded so code review and tests
 * can point at them. These are product requirements, not preferences.
 */
export const ANTI_SCROLL_RULES = [
  "No home feed: no screen displays posts from followed accounts.",
  "No Explore: no discovery grid, trending recommendations or suggested accounts.",
  "No Reel browser: Reels open only from a DM or the owned-content library.",
  "No swipe-next: finishing a Reel returns to the conversation or previous screen.",
  "No algorithmic recommendations: the backend never fetches or builds engagement-based content.",
  "Finite lists: inbox, comments and content lists paginate with clear stopping points.",
  "Action-first home: the app opens on unread conversations or business tasks.",
  "Exit after task: after a reply or publish the UI routes back to a neutral dashboard.",
] as const;
