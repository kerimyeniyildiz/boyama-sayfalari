import type { NextRequest } from "next/server";

import { env } from "@/lib/env";

const encoder = new TextEncoder();

type AdminSession = {
  email: string;
  issuedAt: number;
};

const SESSION_COOKIE_NAME = "boyama_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8 * 1000; // 8 hours in ms

function base64UrlToUint8Array(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < array.length; i += 1) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function parseSession(token: string): Promise<AdminSession | null> {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const bodyBytes = encoder.encode(body);
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const expectedSignatureBuffer = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    bodyBytes
  );
  const expectedSignature = uint8ArrayToBase64Url(
    new Uint8Array(expectedSignatureBuffer)
  );

  const signatureBytes = base64UrlToUint8Array(signature);
  const expectedBytes = base64UrlToUint8Array(expectedSignature);

  if (!timingSafeEqual(signatureBytes, expectedBytes)) {
    return null;
  }

  try {
    const payloadJson = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as AdminSession;

    if (
      typeof payload.email === "string" &&
      typeof payload.issuedAt === "number"
    ) {
      if (Date.now() - payload.issuedAt > SESSION_MAX_AGE) {
        return null;
      }
      return payload;
    }
  } catch (error) {
    console.error("Edge session parse error", error);
  }

  return null;
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<AdminSession | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return parseSession(token);
}
