import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/sitemap-utils";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" }
  });

  return categories.map((category) => ({
    url: `${baseUrl}/kategori/${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7
  }));
}
