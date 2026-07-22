import "server-only";

import { NextResponse } from "next/server";

import { getSessionFromCookies } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

const ADMIN_MUTATION_LIMIT = 60;
const ADMIN_MUTATION_WINDOW_MS = 5 * 60 * 1000; // 5 dakika

function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "0.0.0.0";
}

/**
 * Admin POST/PUT/DELETE uç noktalarında kötüye kullanımı (spam, brute force)
 * sınırlamak için çağrılır. Oturumdaki admin e-posta + IP kombinasyonunu kullanır.
 * Sınır aşılırsa 429 yanıtı döner, geçilirse `null` döner.
 */
export async function enforceAdminMutationLimit(
  request: Request,
  scope: string
): Promise<NextResponse | null> {
  const session = await getSessionFromCookies();
  const identity = session?.email ?? "anon";
  const ip = resolveClientIp(request);

  const result = consumeRateLimit({
    key: `admin-mutation:${scope}:${identity}:${ip}`,
    limit: ADMIN_MUTATION_LIMIT,
    windowMs: ADMIN_MUTATION_WINDOW_MS
  });

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Çok fazla istek gönderdiniz. Lütfen bir süre sonra tekrar deneyin."
      }
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "no-store"
      }
    }
  );
}
