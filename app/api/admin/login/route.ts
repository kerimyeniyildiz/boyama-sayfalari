import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

const INVALID_CREDENTIALS_MESSAGE = "E-posta veya şifre hatalı.";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 8;
const DUMMY_BCRYPT_HASH = "$2a$12$YxYsB4n0e1Cd7wQnU4T2W.rklnv1jH4yj7Z7fFjRn5/HxYJzP9z1S"; // "invalid-password"

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

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

async function verifyBootstrapCredentials(email: string, password: string) {
  const adminEmail = env.ADMIN_EMAIL?.trim();
  if (!adminEmail || email !== adminEmail) {
    return { matched: false as const };
  }

  const adminPasswordHash = env.ADMIN_PASSWORD_HASH?.trim();
  const adminPassword = env.ADMIN_PASSWORD;

  if (adminPasswordHash) {
    const hashMatches = await bcrypt.compare(password, adminPasswordHash);
    if (hashMatches) {
      return { matched: true as const, hashToPersist: adminPasswordHash };
    }
  }

  if (adminPassword) {
    const plainMatches = timingSafeStringEqual(password, adminPassword);
    if (plainMatches) {
      return {
        matched: true as const,
        hashToPersist: await bcrypt.hash(password, 12)
      };
    }
  }

  return { matched: false as const };
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
  const bootstrapResult = await verifyBootstrapCredentials(email, password);

  if (!admin) {
    if (bootstrapResult.matched) {
      admin = await prisma.adminUser.upsert({
        where: { email },
        update: { passwordHash: bootstrapResult.hashToPersist },
        create: { email, passwordHash: bootstrapResult.hashToPersist }
      });
    }
  }

  if (!admin) {
    await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH ?? DUMMY_BCRYPT_HASH);
    return NextResponse.json(
      { error: INVALID_CREDENTIALS_MESSAGE },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let isValid = await bcrypt.compare(password, admin.passwordHash);

  if (!isValid && bootstrapResult.matched) {
    admin = await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: bootstrapResult.hashToPersist }
    });
    isValid = true;
  }

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
