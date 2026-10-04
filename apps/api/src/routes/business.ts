import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";

export default async function businessRoutes(app: FastifyInstance, ctx: AppContext) {
  app.addHook("preHandler", app.requireUser);

  app.get("/business/dashboard", async (req) => {
    const { store } = ctx.forUser(req.userId!);
    return store.getDashboard();
  });

  app.get<{ Querystring: { accountId?: string; unanswered?: string } }>("/business/comments", async (req) => {
    const { store } = ctx.forUser(req.userId!);
    return { comments: await store.listComments({ accountId: req.query.accountId, unansweredOnly: req.query.unanswered === "1" }) };
  });

  const ReplySchema = z.object({ accountId: z.string(), text: z.string().min(1).max(2200) });
  app.post<{ Params: { id: string } }>("/business/comments/:id/reply", async (req, reply) => {
    const body = ReplySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store, gateway } = ctx.forUser(req.userId!);
    const account = await store.getAccount(body.data.accountId);
    if (!account) return reply.code(404).send({ error: "Account not found" });
    await gateway.replyToComment(account, req.params.id, body.data.text);
    return store.updateComment(req.params.id, { replied: true });
  });

  const HideSchema = z.object({ accountId: z.string(), hide: z.boolean() });
  app.post<{ Params: { id: string } }>("/business/comments/:id/hide", async (req, reply) => {
    const body = HideSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store, gateway } = ctx.forUser(req.userId!);
    const account = await store.getAccount(body.data.accountId);
    if (!account) return reply.code(404).send({ error: "Account not found" });
    await gateway.hideComment(account, req.params.id, body.data.hide);
    return store.updateComment(req.params.id, { hidden: body.data.hide });
  });

  /** Owned content only. There is deliberately no endpoint for other accounts' media. */
  app.get<{ Querystring: { accountId?: string } }>("/content/published", async (req) => {
    const { store, gateway } = ctx.forUser(req.userId!);
    let media = await store.listOwnedMedia(req.query.accountId);
    if (media.length === 0) {
      const accounts = (await store.listAccounts()).filter((a) => !req.query.accountId || a.id === req.query.accountId);
      media = (await Promise.all(accounts.map((a) => gateway.syncOwnedMedia(a)))).flat();
    }
    return { media: media.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) };
  });
}
