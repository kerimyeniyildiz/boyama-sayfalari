import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { buildColoringPagePath } from "@/lib/page-paths";
import { getPublicUrl } from "@/lib/r2";
import { getBaseUrl } from "@/lib/sitemap-utils";

export const revalidate = 86400;

type ExtendedSitemapEntry = MetadataRoute.Sitemap[number] & {
  images?: Array<{ url: string; title?: string }>;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const pages = await prisma.coloringPage.findMany({
    where: { status: "PUBLISHED", parentId: null },
    select: {
      slug: true,
      title: true,
      updatedAt: true,
      thumbWebpKey: true,
      coverImageKey: true,
      parent: { select: { slug: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  const entries: ExtendedSitemapEntry[] = pages.map((page) => {
    const path = buildColoringPagePath(page);
    const images: NonNullable<ExtendedSitemapEntry["images"]> = [];

    if (page.thumbWebpKey) {
      images.push({
        url: getPublicUrl(page.thumbWebpKey),
        title: page.title
      });
    } else if (page.coverImageKey) {
      images.push({
        url: getPublicUrl(page.coverImageKey),
        title: page.title
      });
    }

    return {
      url: `${baseUrl}${path}`,
      lastModified: page.updatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
      images: images.length > 0 ? images : undefined
    };
  });

  return entries;
}
