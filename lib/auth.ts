import "server-only";
import crypto from "node:crypto";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { env, isProduction } from "@/lib/env";

export const SESSION_COOKIE_NAME = "boyama_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 saat

export type AdminSession = {
  email: string;
  issuedAt: number;
};

function signSession(payload: AdminSession): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

function parseSession(token: string): AdminSession | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(body)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as AdminSession;
    if (
      typeof payload.email === "string" &&
      typeof payload.issuedAt === "number"
    ) {
      return payload;
    }
  } catch (error) {
    console.error("Session parse error", error);
  }

  return null;
}

export function getSessionFromCookies(store = cookies()): AdminSession | null {
  const value = store.get(SESSION_COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }

  const session = parseSession(value);
  if (!session) {
    store.delete(SESSION_COOKIE_NAME);
    return null;
  }

  const isExpired =
    Date.now() - session.issuedAt > SESSION_MAX_AGE * 1000;
  if (isExpired) {
    store.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session;
}

export function getSessionFromRequest(request: NextRequest): AdminSession | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? parseSession(token) : null;
}

export function createSession(email: string) {
  const session: AdminSession = { email, issuedAt: Date.now() };
  const token = signSession(session);
  const cookieStore = cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE
  });

  return session;
}

export function destroySession() {
  cookies().delete(SESSION_COOKIE_NAME);
}

export function assertAdminSession() {
  const session = getSessionFromCookies();
  if (!session) {
    throw new Error("Yetkisiz erişim");
  }
  return session;
}
