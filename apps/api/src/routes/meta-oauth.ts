import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildLoginUrl, exchangeCode, listLinkedInstagramAccounts, toLongLivedToken } from "@ig-focus-hub/meta";
import { encryptSecret, prisma } from "@ig-focus-hub/db";
import { MAX_CONNECTED_ACCOUNTS, type AccountAccent } from "@ig-focus-hub/shared";
import type { AppContext } from "../context.js";

const STATE_COOKIE = "igfh_oauth_state";
const ACCENTS: AccountAccent[] = ["pink", "purple", "orange", "blue", "green"];

/**
 * Facebook Login for Instagram Platform.
 *   GET /auth/meta/start     -> redirect to Meta with CSRF state
 *   GET /auth/meta/callback  -> exchange code, upgrade to long-lived, list linked IG accounts
 *   POST /auth/meta/select   -> store chosen accounts (max 3) with encrypted tokens
 */
export default async function metaOauthRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/auth/meta/start", { preHandler: app.requireUser }, async (req, reply) => {
    if (ctx.env.MOCK_META || !ctx.metaClient) {
      return reply.redirect(`${ctx.env.WEB_URL}/settings?connected=mock`);
    }
    const state = randomBytes(16).toString("hex");
    reply.setCookie(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", path: "/auth/meta", maxAge: 600, secure: ctx.env.NODE_ENV === "production" });
    return reply.redirect(buildLoginUrl(ctx.metaClient, ctx.env.META_REDIRECT_URI, state));
  });

  const pending = new Map<string, { userToken: string; expiresAt: Date | null; options: Awaited<ReturnType<typeof listLinkedInstagramAccounts>> }>();

  app.get<{ Querystring: { code?: string; state?: string; error?: string; error_description?: string } }>(
    "/auth/meta/callback",
    { preHandler: app.requireUser },
    async (req, reply) => {
      if (!ctx.metaClient) return reply.code(400).send({ error: "Meta is not configured" });
      const { code, state, error, error_description } = req.query;
      if (error) return reply.redirect(`${ctx.env.WEB_URL}/settings?error=${encodeURIComponent(error_description ?? error)}`);
      if (!code || !state || state !== req.cookies[STATE_COOKIE]) {
        return reply.code(400).send({ error: "Invalid OAuth state" });
      }
      reply.clearCookie(STATE_COOKIE, { path: "/auth/meta" });

      const short = await exchangeCode(ctx.metaClient, code, ctx.env.META_REDIRECT_URI);
      const long = await toLongLivedToken(ctx.metaClient, short.access_token);
      const options = await listLinkedInstagramAccounts(ctx.metaClient, long.access_token);
      const expiresAt = long.expires_in ? new Date(Date.now() + long.expires_in * 1000) : null;
      pending.set(req.userId!, { userToken: long.access_token, expiresAt, options });
      return reply.redirect(`${ctx.env.WEB_URL}/settings/connect`);
    },
  );

  app.get("/auth/meta/options", { preHandler: app.requireUser }, async (req) => {
    const p = pending.get(req.userId!);
    return {
      options: (p?.options ?? []).map((o) => ({ igUserId: o.igUserId, username: o.username, name: o.name, pageName: o.pageName, avatarUrl: o.profilePictureUrl })),
    };
  });

  const SelectSchema = z.object({ igUserIds: z.array(z.string()).min(1).max(MAX_CONNECTED_ACCOUNTS) });
  app.post("/auth/meta/select", { preHandler: app.requireUser }, async (req, reply) => {
    const body = SelectSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const p = pending.get(req.userId!);
    if (!p) return reply.code(400).send({ error: "No pending Meta login. Start again from Settings." });

    const existing = await prisma.igAccount.count({ where: { userId: req.userId! } });
    if (existing + body.data.igUserIds.length > MAX_CONNECTED_ACCOUNTS) {
      return reply.code(400).send({ error: `You can connect at most ${MAX_CONNECTED_ACCOUNTS} accounts` });
    }
    const chosen = p.options.filter((o) => body.data.igUserIds.includes(o.igUserId));
    const created = [];
    for (const [i, o] of chosen.entries()) {
      created.push(
        await prisma.igAccount.upsert({
          where: { igUserId: o.igUserId },
          create: {
            userId: req.userId!,
            igUserId: o.igUserId,
            pageId: o.pageId,
            username: o.username,
            displayName: o.name ?? o.username,
            label: o.name ?? o.username,
            accent: ACCENTS[(existing + i) % ACCENTS.length]!,
            avatarUrl: o.profilePictureUrl,
            pageTokenEnc: encryptSecret(o.pageAccessToken),
            userTokenEnc: encryptSecret(p.userToken),
            tokenExpiresAt: p.expiresAt,
          },
          update: {
            pageTokenEnc: encryptSecret(o.pageAccessToken),
            userTokenEnc: encryptSecret(p.userToken),
            tokenExpiresAt: p.expiresAt,
            status: "active",
          },
        }),
      );
    }
    pending.delete(req.userId!);
    return { connected: created.map((c) => c.id) };
  });
}
