import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz giriş bilgileri." }, { status: 400 });
  }

  const { email, password } = parsed.data;

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
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Şifre hatalı." }, { status: 401 });
  }

  createSession(admin.email);
  return NextResponse.json({ success: true });
}
