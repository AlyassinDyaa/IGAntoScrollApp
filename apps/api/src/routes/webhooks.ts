import type { FastifyInstance } from "fastify";
import { normalizeWebhookBody, verifyWebhookSignature } from "@ig-focus-hub/meta";
import { prisma } from "@ig-focus-hub/db";
import type { AppContext } from "../context.js";

/**
 * Meta webhooks. GET verifies the subscription; POST ingests events after HMAC check.
 * Events fan out to push notifications with sender, account and a deep link.
 */
export default async function webhookRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get<{ Querystring: Record<string, string> }>("/webhooks/meta", async (req, reply) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token && token === ctx.env.META_WEBHOOK_VERIFY_TOKEN) {
      return reply.type("text/plain").send(challenge);
    }
    return reply.code(403).send("Forbidden");
  });

  app.post("/webhooks/meta", { config: { rawBody: true } }, async (req, reply) => {
    const raw = (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    if (!ctx.env.MOCK_META) {
      const ok = verifyWebhookSignature(ctx.env.META_APP_SECRET!, raw, req.headers["x-hub-signature-256"] as string | undefined);
      if (!ok) return reply.code(401).send("Bad signature");
    }
    const events = normalizeWebhookBody(req.body);
    // Respond fast; Meta retries on slow responses.
    void processEvents(events).catch((err) => app.log.error({ err }, "webhook processing failed"));
    return reply.send("EVENT_RECEIVED");
  });

  async function processEvents(events: ReturnType<typeof normalizeWebhookBody>) {
    if (ctx.env.MOCK_META) return;
    for (const ev of events) {
      const account = await prisma.igAccount.findUnique({ where: { igUserId: ev.igUserId } });
      const stored = await prisma.webhookEvent.create({
        data: { accountId: account?.id ?? null, kind: ev.kind, payload: ev.raw as object },
      });
      if (!account) continue;
      const { store, push } = ctx.forUser(account.userId);
      try {
        if (ev.kind === "message" && ev.senderId && ev.senderId !== account.igUserId) {
          const convs = await store.listConversations({ accountId: account.id });
          const conv = convs.find((c) => c.participant.igUserId === ev.senderId);
          const who = conv?.participant.name ?? conv?.participant.username ?? "Someone";
          const payload = {
            kind: ev.hasSharedMedia ? ("sent_reel" as const) : ("new_dm" as const),
            title: `${who} · ${account.label}`,
            body: ev.hasSharedMedia ? `${who} sent you a Reel` : (ev.text ?? "New message"),
            accountId: account.id,
            url: conv ? `/inbox/${conv.id}` : "/inbox",
            tag: conv?.id,
          };
          if (await push.shouldDeliver(payload, { priorityContact: conv?.priority ?? false })) await push.send(payload);
        } else if (ev.kind === "reaction" && ev.reaction) {
          const payload = { kind: "reaction" as const, title: account.label, body: `Reacted ${ev.reaction} to your message`, accountId: account.id, url: "/inbox" };
          if (await push.shouldDeliver(payload, { priorityContact: false })) await push.send(payload);
        } else if (ev.kind === "comment" && ev.text) {
          const payload = { kind: "comment" as const, title: `New comment · ${account.label}`, body: ev.text, accountId: account.id, url: "/business" };
          if (await push.shouldDeliver(payload, { priorityContact: false })) await push.send(payload);
        }
        await prisma.webhookEvent.update({ where: { id: stored.id }, data: { processedAt: new Date() } });
      } catch (err) {
        await prisma.webhookEvent.update({ where: { id: stored.id }, data: { error: (err as Error).message } });
      }
    }
  }
}
