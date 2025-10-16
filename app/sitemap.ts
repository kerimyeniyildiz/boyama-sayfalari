import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url.replace(/\/$/, "");

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${baseUrl}/ara`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8
    }
  ];

  try {
    const [pages, categories, tags] = await Promise.all([
      prisma.coloringPage.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true }
      }),
      prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.tag.findMany({ select: { slug: true, updatedAt: true } })
    ]);

    for (const page of pages) {
      entries.push({
        url: `${baseUrl}/sayfa/${page.slug}`,
        lastModified: page.updatedAt,
        changeFrequency: "weekly",
        priority: 0.9
      });
    }

    for (const category of categories) {
      entries.push({
        url: `${baseUrl}/kategori/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7
      });
    }

    for (const tag of tags) {
      entries.push({
        url: `${baseUrl}/etiket/${tag.slug}`,
        lastModified: tag.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6
      });
    }
  } catch (error) {
    console.error("Sitemap generation skipped due to database error", error);
  }

  return entries;
}
