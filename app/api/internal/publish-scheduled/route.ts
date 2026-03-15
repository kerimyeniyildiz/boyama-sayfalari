import crypto from "node:crypto";
import { PageStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { buildColoringPagePath } from "@/lib/page-paths";
import {
  CACHE_TAGS,
  tagForCategory,
  tagForColoringPage,
  tagForTag
} from "@/lib/cache-tags";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = env.INTERNAL_CRON_SECRET;
  if (!secret) {
    return false;
  }

  const provided =
    request.headers.get("x-internal-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  const secretBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  if (secretBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(secretBuffer, providedBuffer);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Yetkisiz erişim" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const now = new Date();
  const duePages = await prisma.coloringPage.findMany({
    where: {
      status: PageStatus.DRAFT,
      publishAt: { lte: now }
    },
    select: {
      id: true,
      slug: true,
      parent: { select: { slug: true } },
      categories: { select: { category: { select: { slug: true } } } },
      tags: { select: { tag: { select: { slug: true } } } }
    }
  });

  if (duePages.length === 0) {
    return NextResponse.json({ success: true, published: 0 });
  }

  await prisma.coloringPage.updateMany({
    where: {
      id: { in: duePages.map((page) => page.id) }
    },
    data: {
      status: PageStatus.PUBLISHED,
      publishAt: null
    }
  });

  const categorySlugs = new Set<string>();
  const tagSlugs = new Set<string>();

  duePages.forEach((page) => {
    page.categories.forEach((relation) => categorySlugs.add(relation.category.slug));
    page.tags.forEach((relation) => tagSlugs.add(relation.tag.slug));
  });

  revalidatePath("/");
  revalidatePath("/ara");
  revalidatePath("/sitemap.xml");
  revalidatePath("/sitemaps/core.xml");
  revalidatePath("/sitemaps/pages.xml");
  revalidatePath("/sitemaps/images.xml");
  revalidatePath("/sitemaps/categories.xml");
  revalidatePath("/sitemaps/tags.xml");
  revalidatePath("/admin/pages");
  duePages.forEach((page) => {
    revalidatePath(buildColoringPagePath(page));
  });
  categorySlugs.forEach((slug) => revalidatePath(`/kategori/${slug}`));
  tagSlugs.forEach((slug) => revalidatePath(`/etiket/${slug}`));

  revalidateTag(CACHE_TAGS.coloringPages);
  revalidateTag(CACHE_TAGS.categories);
  revalidateTag(CACHE_TAGS.tags);
  duePages.forEach((page) => revalidateTag(tagForColoringPage(page.slug)));
  categorySlugs.forEach((slug) => revalidateTag(tagForCategory(slug)));
  tagSlugs.forEach((slug) => revalidateTag(tagForTag(slug)));

  return NextResponse.json({ success: true, published: duePages.length });
}
