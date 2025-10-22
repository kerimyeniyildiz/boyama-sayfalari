import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/seo";

export function getBaseUrl(): string {
  return siteConfig.url.replace(/\/$/, "");
}

export async function getLatestContentUpdate(): Promise<Date> {
  try {
    const [pageAgg, categoryAgg, tagAgg] = await Promise.all([
      prisma.coloringPage.aggregate({
        _max: { updatedAt: true }
      }),
      prisma.category.aggregate({
        _max: { updatedAt: true }
      }),
      prisma.tag.aggregate({
        _max: { updatedAt: true }
      })
    ]);

    return (
      pageAgg._max.updatedAt ??
      categoryAgg._max.updatedAt ??
      tagAgg._max.updatedAt ??
      new Date()
    );
  } catch (error) {
    console.error("Sitemap: içerik güncelleme tarihi alınamadı", error);
    return new Date();
  }
}
