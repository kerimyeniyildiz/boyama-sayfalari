import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  getDownloadablePage,
  incrementDownloads
} from "@/lib/data/coloring-pages";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSignedDownloadUrl } from "@/lib/r2";

export const runtime = "nodejs";

function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || "0.0.0.0";
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const page = await getDownloadablePage(params.slug);

  if (!page) {
    return NextResponse.json(
      { error: "Boyama sayfası bulunamadı." },
      { status: 404 }
    );
  }

  const ip = resolveClientIp(request);
  const ipHash = crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(ip)
    .digest("hex");
  const userAgent = request.headers.get("user-agent") ?? undefined;

  const contentDisposition = `attachment; filename="${page.slug}.pdf"`;
  const signedUrl = await getSignedDownloadUrl(
    page.pdfKey,
    300,
    contentDisposition
  );

  await Promise.all([
    incrementDownloads(page.id),
    prisma.downloadEvent.create({
      data: {
        pageId: page.id,
        ipHash,
        userAgent
      }
    })
  ]);

  return NextResponse.redirect(signedUrl, {
    status: 302,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
