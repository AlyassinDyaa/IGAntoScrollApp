import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CrmLabelSchema, ReactInputSchema, SendMessageInputSchema } from "@ig-focus-hub/shared";
import type { AppContext } from "../context.js";

export default async function inboxRoutes(app: FastifyInstance, ctx: AppContext) {
  app.addHook("preHandler", app.requireUser);

  app.get<{ Querystring: { accountId?: string; q?: string; needsReply?: string } }>("/inbox/conversations", async (req) => {
    const { store } = ctx.forUser(req.userId!);
    const needsReply = req.query.needsReply === undefined ? undefined : req.query.needsReply === "1";
    return { conversations: await store.listConversations({ accountId: req.query.accountId, query: req.query.q, needsReply }) };
  });

  /** Pull fresh threads from Meta for every active account. Finite: one page per account. */
  app.post("/inbox/sync", async (req) => {
    const { store, gateway } = ctx.forUser(req.userId!);
    const accounts = await store.listAccounts();
    let synced = 0;
    for (const account of accounts.filter((a) => a.status === "active")) {
      const convs = await gateway.syncConversations(account);
      const upsert = (store as { upsertConversations?: (c: typeof convs) => Promise<void> }).upsertConversations;
      if (upsert) await upsert.call(store, convs);
      synced += convs.length;
    }
    return { synced };
  });

  app.get<{ Params: { id: string } }>("/inbox/conversations/:id", async (req, reply) => {
    const { store, gateway } = ctx.forUser(req.userId!);
    const conversation = await store.getConversation(req.params.id);
    if (!conversation) return reply.code(404).send({ error: "Conversation not found" });
    const account = await store.getAccount(conversation.accountId);
    let messages = await store.listMessages(conversation.id);
    if (messages.length === 0 && account) {
      messages = await gateway.syncMessages(account, conversation);
      for (const m of messages) await store.appendMessage(m);
    }
    if (conversation.unreadCount > 0) await store.updateConversation(conversation.id, { unreadCount: 0 });
    const note = await store.getPrivateNote(conversation.id);
    return { conversation: { ...conversation, unreadCount: 0 }, account, messages, privateNote: note };
  });

  const PatchSchema = z.object({
    favorite: z.boolean().optional(),
    mutedLocally: z.boolean().optional(),
    priority: z.boolean().optional(),
    needsReply: z.boolean().optional(),
    labels: z.array(CrmLabelSchema).optional(),
    privateNote: z.string().max(2000).nullable().optional(),
  });
  app.patch<{ Params: { id: string } }>("/inbox/conversations/:id", async (req, reply) => {
    const body = PatchSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store } = ctx.forUser(req.userId!);
    return store.updateConversation(req.params.id, body.data);
  });

  /** Reply safety: the sending account is echoed back so the UI can confirm it before send. */
  app.post("/inbox/messages", async (req, reply) => {
    const body = SendMessageInputSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store, gateway } = ctx.forUser(req.userId!);
    const [conversation, account] = await Promise.all([store.getConversation(body.data.conversationId), store.getAccount(body.data.accountId)]);
    if (!conversation || !account) return reply.code(404).send({ error: "Conversation or account not found" });
    if (conversation.accountId !== account.id) return reply.code(400).send({ error: "This conversation belongs to a different account" });
    const message = await gateway.sendText(account, conversation, body.data.text);
    await store.appendMessage(message);
    return { message, sentAs: { id: account.id, username: account.username, label: account.label } };
  });

  app.post("/inbox/reactions", async (req, reply) => {
    const body = ReactInputSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store, gateway } = ctx.forUser(req.userId!);
    const account = await store.getAccount(body.data.accountId);
    if (!account) return reply.code(404).send({ error: "Account not found" });
    const convs = await store.listConversations({ accountId: account.id });
    let target = null as Awaited<ReturnType<typeof store.getConversation>>;
    for (const c of convs) {
      if ((await store.listMessages(c.id)).some((m) => m.id === body.data.messageId)) { target = c; break; }
    }
    if (!target) return reply.code(404).send({ error: "Message not found" });
    await gateway.react(account, target, body.data.messageId, body.data.emoji, body.data.action);
    return { ok: true };
  });

  app.get("/inbox/saved-replies", async (req) => {
    const { store } = ctx.forUser(req.userId!);
    return { replies: await store.listSavedReplies() };
  });
  const ReplySchema = z.object({ id: z.string().optional(), title: z.string().min(1).max(60), body: z.string().min(1).max(1000), shortcut: z.string().max(16).nullable() });
  app.put("/inbox/saved-replies", async (req, reply) => {
    const body = ReplySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store } = ctx.forUser(req.userId!);
    return store.upsertSavedReply(body.data);
  });
  app.delete<{ Params: { id: string } }>("/inbox/saved-replies/:id", async (req, reply) => {
    const { store } = ctx.forUser(req.userId!);
    await store.deleteSavedReply(req.params.id);
    return reply.code(204).send();
  });
}
