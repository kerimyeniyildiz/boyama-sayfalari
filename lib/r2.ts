import { getCloudflareContext } from "@opennextjs/cloudflare";

import { env } from "@/lib/env";

function getBucket(): R2Bucket {
  return getCloudflareContext().env.MEDIA_BUCKET;
}

function sanitizePublicBaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hostname = parsed.hostname.replace(/\.$/, "");
    parsed.pathname = parsed.pathname.replace(/\/$/, "");
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return rawUrl.trim().replace(/\.$/, "").replace(/\/$/, "");
  }
}

const publicBaseUrl = sanitizePublicBaseUrl(env.R2_PUBLIC_URL);

export function getPublicUrl(key: string): string {
  const normalizedKey = key.replace(/^\/+/, "");
  return `${publicBaseUrl}/${normalizedKey}`;
}

export async function uploadToR2(options: {
  key: string;
  body: Buffer | ArrayBuffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}) {
  await getBucket().put(options.key, options.body, {
    httpMetadata: {
      contentType: options.contentType,
      cacheControl:
        options.cacheControl ?? "public, max-age=31536000, immutable"
    }
  });
}

export async function deleteFromR2(key: string) {
  await getBucket().delete(key);
}

export async function ensureObjectExists(key: string) {
  const object = await getBucket().head(key);
  if (!object) {
    throw new Error(`R2 nesnesi bulunamadı: ${key}`);
  }
}

export async function getR2Object(key: string) {
  return getBucket().get(key);
}
