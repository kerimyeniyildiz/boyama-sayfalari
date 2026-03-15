import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

const INVALID_CREDENTIALS_MESSAGE = "E-posta veya şifre hatalı.";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 8;

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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz giriş bilgileri." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const ip = resolveClientIp(request);

  const limitResult = consumeRateLimit({
    key: `admin-login:${email.toLowerCase()}:${ip}`,
    limit: LOGIN_ATTEMPT_LIMIT,
    windowMs: LOGIN_WINDOW_MS
  });

  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limitResult.retryAfterSeconds),
          "Cache-Control": "no-store"
        }
      }
    );
  }

  let admin = await prisma.adminUser.findUnique({ where: { email } });

  if (!admin && email === env.ADMIN_EMAIL) {
    const matches = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
    if (matches) {
      admin = await prisma.adminUser.upsert({
        where: { email },
        update: {},
        create: { email, passwordHash: env.ADMIN_PASSWORD_HASH }
      });
    }
  }

  if (!admin) {
    await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
    return NextResponse.json(
      { error: INVALID_CREDENTIALS_MESSAGE },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: INVALID_CREDENTIALS_MESSAGE },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  createSession(admin.email);
  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
