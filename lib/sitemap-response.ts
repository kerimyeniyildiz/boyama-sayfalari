import type { MetadataRoute } from "next";

export type SitemapEntry = MetadataRoute.Sitemap[number] & {
  images?: Array<{ url: string; title?: string }>;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: string | Date | undefined): string | undefined {
  if (!date) {
    return undefined;
  }
  if (date instanceof Date) {
    return date.toISOString();
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function formatPriority(priority: number | undefined): string | undefined {
  if (typeof priority !== "number") {
    return undefined;
  }
  const clamped = Math.min(Math.max(priority, 0), 1);
  return clamped.toFixed(1).replace(/\.0$/, "");
}

function renderUrl(entry: SitemapEntry): string {
  const parts: string[] = [`  <url>`, `    <loc>${escapeXml(entry.url)}</loc>`];

  const lastModified = formatDate(entry.lastModified);
  if (lastModified) {
    parts.push(`    <lastmod>${lastModified}</lastmod>`);
  }

  if (entry.changeFrequency) {
    parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
  }

  const priority = formatPriority(entry.priority);
  if (priority) {
    parts.push(`    <priority>${priority}</priority>`);
  }

  if (Array.isArray(entry.images) && entry.images.length > 0) {
    entry.images.forEach((image) => {
      if (!image?.url) {
        return;
      }
      parts.push("    <image:image>");
      parts.push(`      <image:loc>${escapeXml(image.url)}</image:loc>`);
      if (image.title) {
        parts.push(`      <image:title>${escapeXml(image.title)}</image:title>`);
      }
      parts.push("    </image:image>");
    });
  }

  parts.push("  </url>");
  return parts.join("\n");
}

function renderSitemap(entries: SitemapEntry[]): string {
  const hasImages = entries.some((entry) => Array.isArray(entry.images) && entry.images.length > 0);
  const namespaces = [`xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`];
  if (hasImages) {
    namespaces.push(`xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`);
  }

  const urls = entries.map(renderUrl).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${namespaces.join(" ")}>\n${urls}\n</urlset>\n`;
}

export function buildSitemapResponse(entries: SitemapEntry[]): Response {
  const xml = renderSitemap(entries);
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400"
    }
  });
}
