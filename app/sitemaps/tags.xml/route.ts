import { prisma } from "@/lib/db";
import { buildSitemapResponse, type SitemapEntry } from "@/lib/sitemap-response";
import { getBaseUrl } from "@/lib/sitemap-utils";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

export async function GET(): Promise<Response> {
  const baseUrl = getBaseUrl();

  try {
    const tags = await prisma.tag.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }
    });

    const entries: SitemapEntry[] = tags.map((tag) => ({
      url: `${baseUrl}/etiket/${tag.slug}`,
      lastModified: tag.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6
    }));

    return buildSitemapResponse(entries);
  } catch (error) {
    console.error("Sitemap: etiketler listelenemedi", error);
    return buildSitemapResponse([]);
  }
}

