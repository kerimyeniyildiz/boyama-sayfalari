import { prisma } from "@/lib/db";
import { buildColoringPagePath } from "@/lib/page-paths";
import { getPublicUrl } from "@/lib/r2";
import { buildSitemapResponse, type SitemapEntry } from "@/lib/sitemap-response";
import { getBaseUrl } from "@/lib/sitemap-utils";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

export async function GET(): Promise<Response> {
  const baseUrl = getBaseUrl();

  try {
    const pages = await prisma.coloringPage.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        title: true,
        updatedAt: true,
        thumbWebpKey: true,
        coverImageKey: true,
        parent: { select: { slug: true } },
        parentId: true
      },
      orderBy: { updatedAt: "desc" }
    });

    const entriesByUrl = new Map<
      string,
      {
        lastModified: Date;
        priority: number;
        images: Map<string, { url: string; title?: string }>;
      }
    >();

    pages.forEach((page) => {
      const path = buildColoringPagePath(page);
      const url = `${baseUrl}${path}`;
      const current = entriesByUrl.get(url);
      const images = current?.images ?? new Map<string, { url: string; title?: string }>();

      if (page.thumbWebpKey) {
        const imageUrl = getPublicUrl(page.thumbWebpKey);
        images.set(imageUrl, {
          url: imageUrl,
          title: page.title
        });
      }

      if (page.coverImageKey && page.coverImageKey !== page.thumbWebpKey) {
        const imageUrl = getPublicUrl(page.coverImageKey);
        images.set(imageUrl, {
          url: imageUrl,
          title: page.title
        });
      }

      if (images.size === 0) {
        return;
      }

      const nextLastModified =
        current && current.lastModified > page.updatedAt
          ? current.lastModified
          : page.updatedAt;
      const nextPriority =
        current && current.priority > (page.parentId ? 0.5 : 0.8)
          ? current.priority
          : page.parentId
            ? 0.5
            : 0.8;

      entriesByUrl.set(url, {
        lastModified: nextLastModified,
        priority: nextPriority,
        images
      });
    });

    const entries: SitemapEntry[] = Array.from(entriesByUrl.entries())
      .map(([url, entry]) => ({
        url,
        lastModified: entry.lastModified,
        changeFrequency: "weekly" as const,
        priority: entry.priority,
        images: Array.from(entry.images.values())
      }))
      .sort((a, b) => {
        const left = a.lastModified ? new Date(a.lastModified).getTime() : 0;
        const right = b.lastModified ? new Date(b.lastModified).getTime() : 0;
        return right - left;
      });

    return buildSitemapResponse(entries);
  } catch (error) {
    console.error("Sitemap: gorsel listesi olusturulamadi", error);
    return buildSitemapResponse([]);
  }
}
