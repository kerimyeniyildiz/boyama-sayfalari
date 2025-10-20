import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/lib/env";

const client = new S3Client({
  region: "auto",
  endpoint: env.R2_S3_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

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
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}) {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType,
    CacheControl:
      options.cacheControl ?? "public, max-age=31536000, immutable"
  });

  await client.send(command);
}

export async function deleteFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key
  });

  await client.send(command);
}

export async function ensureObjectExists(key: string) {
  const command = new HeadObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key
  });

  await client.send(command);
}

export function getSignedDownloadUrl(
  key: string,
  expiresIn = 300,
  contentDisposition?: string
) {
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: contentDisposition
    }),
    { expiresIn }
  );
}

export async function createPresignedPutUrl(
  key: string,
  expiresIn = 600
): Promise<string> {
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key
    }),
    { expiresIn }
  );
}
