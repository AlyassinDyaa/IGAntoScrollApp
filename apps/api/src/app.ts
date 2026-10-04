import { join } from "node:path";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import type { Env } from "./config.js";
import { createContext, MOCK_USER_ID } from "./context.js";
import sessionPlugin from "./plugins/session.js";
import accountRoutes from "./routes/accounts.js";
import audioRoutes from "./routes/audio.js";
import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/business.js";
import inboxRoutes from "./routes/inbox.js";
import metaOauthRoutes from "./routes/meta-oauth.js";
import publishRoutes from "./routes/publish.js";
import settingsRoutes from "./routes/settings.js";
import webhookRoutes from "./routes/webhooks.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: env.NODE_ENV === "test" ? false : { transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined },
    bodyLimit: 2 * 1024 * 1024,
  });
  const ctx = createContext(env);

  // Keep the raw body for webhook HMAC verification.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    (req as unknown as { rawBody: string }).rawBody = body as string;
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Mock mode serves fixture data only, so any origin may call it (lets a fresh Vercel
  // preview talk to the demo API without reconfiguring). Real mode is pinned to WEB_URL.
  await app.register(cors, { origin: env.MOCK_META ? true : [env.WEB_URL], credentials: true });
  await app.register(cookie);
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(multipart);
  await app.register(fastifyStatic, { root: join(process.cwd(), env.UPLOAD_DIR), prefix: "/media/", decorateReply: false });
  await app.register(sessionPlugin, { secret: env.SESSION_SECRET, mockUserId: env.MOCK_META ? MOCK_USER_ID : null });

  app.get("/health", async () => ({ ok: true, mock: env.MOCK_META, version: env.META_GRAPH_VERSION }));

  await app.register(authRoutes, ctx);
  await app.register(metaOauthRoutes, ctx);
  await app.register(accountRoutes, ctx);
  await app.register(inboxRoutes, ctx);
  await app.register(publishRoutes, ctx);
  await app.register(audioRoutes, ctx);
  await app.register(businessRoutes, ctx);
  await app.register(settingsRoutes, ctx);
  await app.register(webhookRoutes, ctx);

  app.addHook("onClose", async () => ctx.close());
  return app;
}
