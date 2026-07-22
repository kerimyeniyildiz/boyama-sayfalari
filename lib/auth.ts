import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { env, isProduction } from "@/lib/env";
import {
  parseSessionToken,
  signSessionToken,
  type SessionPayload
} from "@/lib/session-token";

export const SESSION_COOKIE_NAME = "boyama_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 saat

export type AdminSession = SessionPayload;

export async function getSessionFromCookies(
  store?: Awaited<Awaited<ReturnType<typeof cookies>>>
): Promise<AdminSession | null> {
  const cookieStore = store ?? (await cookies());
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }

  const session = parseSessionToken(value, env.SESSION_SECRET);
  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  const isExpired =
    Date.now() - session.issuedAt > SESSION_MAX_AGE * 1000;
  if (isExpired) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session;
}

export function getSessionFromRequest(request: NextRequest): AdminSession | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? parseSessionToken(token, env.SESSION_SECRET) : null;
}

export async function createSession(email: string) {
  const session: AdminSession = { email, issuedAt: Date.now() };
  const token = signSessionToken(session, env.SESSION_SECRET);
  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE
  });

  return session;
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

export async function assertAdminSession() {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new Error("Yetkisiz erişim");
  }
  return session;
}
