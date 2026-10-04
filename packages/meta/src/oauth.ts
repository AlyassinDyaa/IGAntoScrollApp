import type { MetaClient } from "./client";

/**
 * Facebook Login for the Instagram Platform.
 * Chosen over Instagram Login because the Instagram Audio API is tied to this route.
 * Each professional Instagram account must be linked to a Facebook Page.
 */
export const META_SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_content_publish",
  "instagram_manage_comments",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
  "business_management",
] as const;

export function buildLoginUrl(client: MetaClient, redirectUri: string, state: string): string {
  const u = new URL(`https://www.facebook.com/${client.graphVersion}/dialog/oauth`);
  u.searchParams.set("client_id", client.appId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", META_SCOPES.join(","));
  return u.toString();
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export async function exchangeCode(
  client: MetaClient,
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const url = client.url("oauth/access_token", {
    client_id: client.appId,
    client_secret: client.appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Code exchange failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

export async function toLongLivedToken(
  client: MetaClient,
  shortLivedToken: string,
): Promise<TokenResponse> {
  const url = client.url("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: client.appId,
    client_secret: client.appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Long-lived exchange failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

export interface LinkedInstagramAccount {
  pageId: string;
  pageName: string;
  /** Page access token (never expires once derived from a long-lived user token). */
  pageAccessToken: string;
  igUserId: string;
  username: string;
  name: string | null;
  profilePictureUrl: string | null;
}

interface PageNode {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

interface IgUserNode {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

/**
 * Lists every Page the user manages that has a linked professional Instagram account.
 * The hub lets the owner pick up to three of them.
 */
export async function listLinkedInstagramAccounts(
  client: MetaClient,
  userAccessToken: string,
): Promise<LinkedInstagramAccount[]> {
  const pages = await client.get<{ data: PageNode[] }>(
    "me/accounts",
    { fields: "id,name,access_token,instagram_business_account", limit: 50 },
    userAccessToken,
  );
  const out: LinkedInstagramAccount[] = [];
  for (const page of pages.data) {
    const ig = page.instagram_business_account;
    if (!ig) continue;
    const user = await client.get<IgUserNode>(
      ig.id,
      { fields: "id,username,name,profile_picture_url" },
      page.access_token,
    );
    out.push({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      igUserId: user.id,
      username: user.username,
      name: user.name ?? null,
      profilePictureUrl: user.profile_picture_url ?? null,
    });
  }
  return out;
}

/** Disconnect: revoke the app's permissions for this user where possible. */
export async function revokePermissions(client: MetaClient, userAccessToken: string): Promise<void> {
  await client.delete("me/permissions", {}, userAccessToken);
}
