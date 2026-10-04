import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";

/**
 * Instagram Audio API passthrough. Results are "supported audio for this account",
 * never a promise of Instagram's full catalog.
 */
export default async function audioRoutes(app: FastifyInstance, ctx: AppContext) {
  app.addHook("preHandler", app.requireUser);

  app.get<{ Querystring: { accountId: string; q?: string; list?: "trending" | "original" } }>("/audio", async (req, reply) => {
    const { store, gateway } = ctx.forUser(req.userId!);
    const account = await store.getAccount(req.query.accountId);
    if (!account) return reply.code(404).send({ error: "Account not found" });
    const q = req.query.q?.trim();
    const tracks = q
      ? await gateway.searchAudio(account, q)
      : req.query.list === "original"
        ? await gateway.originalAudio(account)
        : await gateway.trendingAudio(account);
    return {
      tracks,
      notice: "Audio availability depends on account, region, licensing and API access. Not every song in Instagram will appear here.",
    };
  });
}
