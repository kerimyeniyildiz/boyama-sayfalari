import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/sitemap-utils";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const tags = await prisma.tag.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" }
  });

  return tags.map((tag) => ({
    url: `${baseUrl}/etiket/${tag.slug}`,
    lastModified: tag.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6
  }));
}
