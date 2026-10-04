import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DraftSchema, PUBLISH_LIMITS, PublishRequestSchema } from "@ig-focus-hub/shared";
import type { AppContext } from "../context.js";
import { ACCEPTED_MIME, MAX_UPLOAD_BYTES } from "../services/media.js";

export default async function publishRoutes(app: FastifyInstance, ctx: AppContext) {
  app.addHook("preHandler", app.requireUser);

  app.post("/media/upload", async (req, reply) => {
    const file = await req.file({ limits: { fileSize: MAX_UPLOAD_BYTES } });
    if (!file) return reply.code(400).send({ error: "No file" });
    if (!ACCEPTED_MIME.has(file.mimetype)) return reply.code(415).send({ error: `Unsupported type ${file.mimetype}` });
    const buffer = await file.toBuffer();
    const saved = await ctx.media.save(buffer, file.filename, file.mimetype);
    return { assetId: saved.key, url: saved.url, mimeType: file.mimetype, byteSize: buffer.length };
  });

  app.get("/drafts", async (req) => {
    const { store } = ctx.forUser(req.userId!);
    return { drafts: await store.listDrafts() };
  });

  const UpsertDraft = DraftSchema.omit({ id: true, createdAt: true, updatedAt: true }).extend({ id: z.string().optional() });
  app.put("/drafts", async (req, reply) => {
    const body = UpsertDraft.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const hashtags = (body.data.caption.match(/#\w+/g) ?? []).length;
    if (hashtags > PUBLISH_LIMITS.hashtagMax) return reply.code(400).send({ error: `Instagram allows at most ${PUBLISH_LIMITS.hashtagMax} hashtags` });
    const { store } = ctx.forUser(req.userId!);
    return store.upsertDraft(body.data);
  });

  app.delete<{ Params: { id: string } }>("/drafts/:id", async (req, reply) => {
    const { store } = ctx.forUser(req.userId!);
    await store.deleteDraft(req.params.id);
    return reply.code(204).send();
  });

  /** Publish now or schedule. Always returns the account the content goes out as. */
  app.post("/publish", async (req, reply) => {
    const body = PublishRequestSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store, gateway, scheduler } = ctx.forUser(req.userId!);
    const [draft, account] = await Promise.all([store.getDraft(body.data.draftId), store.getAccount(body.data.accountId)]);
    if (!draft || !account) return reply.code(404).send({ error: "Draft or account not found" });
    if (account.status !== "active") return reply.code(409).send({ error: `@${account.username} needs to be reconnected first` });

    if (body.data.publishAt) {
      const when = new Date(body.data.publishAt);
      if (when.getTime() < Date.now() + 60_000) return reply.code(400).send({ error: "Schedule at least one minute ahead" });
      const scheduled = await store.createScheduled({ draftId: draft.id, accountId: account.id, publishAt: when.toISOString() });
      await scheduler.enqueue(scheduled.id, when);
      return { scheduled, publishAs: { id: account.id, username: account.username, label: account.label } };
    }

    const urls = draft.mediaAssetIds.map((k) => ctx.media.urlFor(k));
    const result = await gateway.publish(account, draft, urls);
    return { published: result, publishAs: { id: account.id, username: account.username, label: account.label } };
  });

  app.get("/scheduled", async (req) => {
    const { store } = ctx.forUser(req.userId!);
    return { scheduled: await store.listScheduled() };
  });

  app.post<{ Params: { id: string } }>("/scheduled/:id/cancel", async (req) => {
    const { store, scheduler } = ctx.forUser(req.userId!);
    await scheduler.cancel(req.params.id);
    return store.updateScheduled(req.params.id, { status: "cancelled" });
  });
}
