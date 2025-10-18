import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  getDownloadablePage,
  incrementDownloads
} from "@/lib/data/coloring-pages";
import { prisma } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const url = new URL(request.url);
  const assetId = url.searchParams.get("asset");

  const page = await getDownloadablePage(params.slug);

  if (!page) {
    return NextResponse.json(
      { error: "Boyama sayfasý bulunamadý." },
      { status: 404 }
    );
  }

  let pdfKey = page.pdfKey;
  let downloadFileName = `${page.slug}.pdf`;

  if (assetId) {
    const assetIndex = page.assets.findIndex((asset) => asset.id === assetId);
    if (assetIndex === -1) {
      return NextResponse.json(
        { error: "Ýstenen görsel bulunamadý." },
        { status: 404 }
      );
    }
    const asset = page.assets[assetIndex];
    pdfKey = asset.pdfKey;
    downloadFileName = `${page.slug}-${assetIndex + 2}.pdf`;
  }

  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "0.0.0.0";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex");
  const userAgent = request.headers.get("user-agent") ?? undefined;

  const contentDisposition = `attachment; filename="${downloadFileName}"`;
  const signedUrl = await getSignedDownloadUrl(pdfKey, 300, contentDisposition);

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