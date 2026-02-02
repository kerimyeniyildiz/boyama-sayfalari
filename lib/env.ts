import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z
    .string()
    .min(1)
    .default("Boyama Sayfaları"),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default("tr-TR"),
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD_HASH: z.string().min(10),
  SESSION_SECRET: z.string().min(32),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_S3_ENDPOINT: z.string().url(),
  R2_PUBLIC_URL: z.string().url(),
  PLAUSIBLE_DOMAIN: z.string().optional(),
  PLAUSIBLE_SCRIPT_SRC: z.string().url().optional(),
  REPLICATE_API_TOKEN: z.string().min(1).optional()
});

export const env = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === "production";
