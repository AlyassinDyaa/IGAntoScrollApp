import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AccountAccentSchema, MAX_CONNECTED_ACCOUNTS } from "@ig-focus-hub/shared";
import type { AppContext } from "../context.js";

export default async function accountRoutes(app: FastifyInstance, ctx: AppContext) {
  app.addHook("preHandler", app.requireUser);

  app.get("/accounts", async (req) => {
    const { store } = ctx.forUser(req.userId!);
    return { accounts: await store.listAccounts(), max: MAX_CONNECTED_ACCOUNTS };
  });

  const PatchSchema = z.object({ label: z.string().min(1).max(24).optional(), accent: AccountAccentSchema.optional() });
  app.patch<{ Params: { id: string } }>("/accounts/:id", async (req, reply) => {
    const body = PatchSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    const { store } = ctx.forUser(req.userId!);
    return store.updateAccount(req.params.id, body.data);
  });

  app.delete<{ Params: { id: string } }>("/accounts/:id", async (req, reply) => {
    const { store } = ctx.forUser(req.userId!);
    await store.removeAccount(req.params.id);
    return reply.code(204).send();
  });
}
