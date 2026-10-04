import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_URL: z.string().url().optional(),
  API_URL: z.string().url().optional(),
  // Set automatically by Render / Railway; used when API_URL is not given.
  RENDER_EXTERNAL_URL: z.string().url().optional(),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
  MOCK_META: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),

  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  SESSION_SECRET: z.string().min(16).default("dev-only-session-secret-change-me"),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_GRAPH_VERSION: z.string().default("v24.0"),
  META_REDIRECT_URI: z.string().url().default("http://localhost:4000/auth/meta/callback"),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:owner@example.com"),

  UPLOAD_DIR: z.string().default("uploads"),
});

export type Env = Omit<z.infer<typeof EnvSchema>, "WEB_URL" | "API_URL"> & { WEB_URL: string; API_URL: string };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  const raw = parsed.data;
  const env: Env = {
    ...raw,
    WEB_URL: raw.WEB_URL ?? "http://localhost:3000",
    API_URL:
      raw.API_URL ??
      raw.RENDER_EXTERNAL_URL ??
      (raw.RAILWAY_PUBLIC_DOMAIN ? `https://${raw.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${raw.PORT}`),
  };
  if (!env.MOCK_META) {
    const missing = (
      ["DATABASE_URL", "TOKEN_ENCRYPTION_KEY", "META_APP_ID", "META_APP_SECRET", "WEB_URL"] as const
    ).filter((k) => !raw[k]);
    if (missing.length) {
      throw new Error(
        `MOCK_META is off but required settings are missing: ${missing.join(", ")}. ` +
          `Set MOCK_META=1 to run with fixture data.`,
      );
    }
  }
  return env;
}
