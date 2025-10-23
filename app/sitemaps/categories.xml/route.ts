import { prisma } from "@/lib/db";
import { buildSitemapResponse, type SitemapEntry } from "@/lib/sitemap-response";
import { getBaseUrl } from "@/lib/sitemap-utils";

export const revalidate = 86400;

export async function GET(): Promise<Response> {
  const baseUrl = getBaseUrl();

  try {
    const categories = await prisma.category.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }
    });

    const entries: SitemapEntry[] = categories.map((category) => ({
      url: `${baseUrl}/kategori/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7
    }));

    return buildSitemapResponse(entries);
  } catch (error) {
    console.error("Sitemap: kategoriler listelenemedi", error);
    return buildSitemapResponse([]);
  }
}
