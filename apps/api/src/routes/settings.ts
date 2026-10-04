import type { FastifyInstance } from "fastify";
import { AccountNotificationPrefsSchema, PushSubscriptionInputSchema, QuietHoursSchema } from "@ig-focus-hub/shared";
import type { AppContext } from "../context.js";

export default async function settingsRoutes(app: FastifyInstance, ctx: AppContext) {
  app.addHook("preHandler", app.requireUser);

  app.get("/settings/notifications", async (req) => {
    const { store, push } = ctx.forUser(req.userId!);
    const [quietHours, prefs] = await Promise.all([store.getQuietHours(), store.listNotificationPrefs()]);
    return { quietHours, prefs, vapidPublicKey: push.publicKey, pushConfigured: !!push.publicKey };
  });

  app.put("/settings/quiet-hours", async (req, reply) => {
    const body = QuietHoursSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store } = ctx.forUser(req.userId!);
    return store.setQuietHours(body.data);
  });

  app.put("/settings/notifications/account", async (req, reply) => {
    const body = AccountNotificationPrefsSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store } = ctx.forUser(req.userId!);
    return store.setNotificationPrefs(body.data);
  });

  app.post("/push/subscribe", async (req, reply) => {
    const body = PushSubscriptionInputSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store } = ctx.forUser(req.userId!);
    await store.addPushSubscription(body.data, req.headers["user-agent"] ?? null);
    return reply.code(201).send({ ok: true });
  });

  app.post<{ Body: { endpoint: string } }>("/push/unsubscribe", async (req, reply) => {
    const { store } = ctx.forUser(req.userId!);
    await store.removePushSubscription(req.body?.endpoint ?? "");
    return reply.code(204).send();
  });

  /** Dev helper: fire a test notification to every registered device. */
  app.post("/push/test", async (req) => {
    const { push } = ctx.forUser(req.userId!);
    return push.send({ kind: "new_dm", title: "IG Focus Hub", body: "Push is working.", accountId: "", url: "/inbox" });
  });
}
