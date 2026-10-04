import { z } from "zod";

/**
 * Up to three professional Instagram accounts live in one hub.
 * Each account carries a persistent accent color, avatar and short label so the
 * sending account is always visible above the composer and the Publish button.
 */
export const MAX_CONNECTED_ACCOUNTS = 3;

export const AccountAccentSchema = z.enum(["pink", "purple", "orange", "blue", "green"]);
export type AccountAccent = z.infer<typeof AccountAccentSchema>;

export const ConnectedAccountSchema = z.object({
  id: z.string(),
  /** Instagram professional account id (IG User ID from Graph API). */
  igUserId: z.string(),
  /** Facebook Page id the IG account is linked to (required by Facebook Login route). */
  pageId: z.string(),
  username: z.string(),
  displayName: z.string(),
  label: z.string().max(24),
  accent: AccountAccentSchema,
  avatarUrl: z.string().url().nullable(),
  connectedAt: z.string().datetime(),
  tokenExpiresAt: z.string().datetime().nullable(),
  status: z.enum(["active", "needs_reauth", "disconnected"]),
});
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;
