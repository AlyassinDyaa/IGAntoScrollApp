import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@ig-focus-hub/db";
import type { AppContext } from "../context.js";
import { MOCK_USER_ID } from "../context.js";
import { SESSION_COOKIE, signSession } from "../plugins/session.js";

const Credentials = z.object({ email: z.string().email(), password: z.string().min(10).max(200) });

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** Hub owner login (not Instagram login). First registration becomes the owner. */
export default async function authRoutes(app: FastifyInstance, ctx: AppContext) {
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: ctx.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30 };

  app.get("/auth/me", async (req) => {
    if (ctx.env.MOCK_META) return { user: { id: MOCK_USER_ID, email: "owner@demo.local" }, mock: true };
    if (!req.userId) return { user: null, mock: false };
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true } });
    return { user, mock: false };
  });

  app.post("/auth/register", async (req, reply) => {
    if (ctx.env.MOCK_META) return reply.code(400).send({ error: "Not available in mock mode" });
    const body = Credentials.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });
    if ((await prisma.user.count()) > 0) return reply.code(403).send({ error: "This hub already has an owner" });
    const user = await prisma.user.create({ data: { email: body.data.email.toLowerCase(), passwordHash: hashPassword(body.data.password) } });
    reply.setCookie(SESSION_COOKIE, signSession(user.id, ctx.env.SESSION_SECRET), cookieOpts);
    return { user: { id: user.id, email: user.email } };
  });

  app.post("/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    if (ctx.env.MOCK_META) return reply.code(400).send({ error: "Not available in mock mode" });
    const body = Credentials.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid credentials" });
    const user = await prisma.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
    if (!user || !verifyPassword(body.data.password, user.passwordHash)) return reply.code(401).send({ error: "Invalid credentials" });
    reply.setCookie(SESSION_COOKIE, signSession(user.id, ctx.env.SESSION_SECRET), cookieOpts);
    return { user: { id: user.id, email: user.email } };
  });

  app.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(204).send();
  });
}
