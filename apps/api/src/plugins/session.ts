import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export const SESSION_COOKIE = "igfh_session";

/**
 * Single-owner session. The value is "<userId>.<hmac>" signed with SESSION_SECRET.
 * In mock mode every request is the demo owner so the UI works immediately.
 */
export function signSession(userId: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(userId).digest("base64url");
  return `${userId}.${mac}`;
}

export function verifySession(value: string | undefined, secret: string): string | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = value.slice(0, idx);
  const mac = value.slice(idx + 1);
  const expected = createHmac("sha256", secret).update(userId).digest("base64url");
  if (mac.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? userId : null;
}

declare module "fastify" {
  interface FastifyRequest {
    userId: string | null;
  }
}

export default fp(async function sessionPlugin(app: FastifyInstance, opts: { secret: string; mockUserId: string | null }) {
  app.decorateRequest("userId", null);
  app.addHook("onRequest", async (req: FastifyRequest) => {
    req.userId = opts.mockUserId ?? verifySession(req.cookies[SESSION_COOKIE], opts.secret);
  });
  app.decorate("requireUser", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.userId) return reply.code(401).send({ error: "Sign in required" });
  });
});

declare module "fastify" {
  interface FastifyInstance {
    requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  }
}
