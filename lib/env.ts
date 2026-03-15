import { z } from "zod";

const envParsers = {
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default("Boyama Sayfaları"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default("tr-TR"),
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD_HASH: z.string().min(10).optional(),
  ADMIN_PASSWORD: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_S3_ENDPOINT: z.string().url(),
  R2_PUBLIC_URL: z.string().url(),
  PLAUSIBLE_DOMAIN: z.string().optional(),
  PLAUSIBLE_SCRIPT_SRC: z.string().url().optional(),
  REPLICATE_API_TOKEN: z.string().min(1).optional(),
  INTERNAL_CRON_SECRET: z.string().min(16).optional()
} as const;

type Env = {
  [K in keyof typeof envParsers]: z.infer<(typeof envParsers)[K]>;
};

const envCache: Partial<Env> = {};

function getEnvValue<K extends keyof Env>(key: K): Env[K] {
  const cached = envCache[key];
  if (cached !== undefined) {
    return cached as Env[K];
  }

  const parsed = envParsers[key].parse(process.env[key]);
  envCache[key] = parsed as Env[K];
  return parsed as Env[K];
}

export const env = new Proxy({} as Env, {
  get(_target, prop) {
    if (typeof prop !== "string" || !(prop in envParsers)) {
      return undefined;
    }
    return getEnvValue(prop as keyof Env);
  }
});

export const isProduction = (process.env.NODE_ENV ?? "development") === "production";
