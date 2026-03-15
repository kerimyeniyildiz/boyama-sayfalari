type SitemapIndexEntry = {
  url: string;
  lastModified?: string | Date;
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
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function buildSitemapIndexResponse(entries: SitemapIndexEntry[]): Response {
  const sitemapEntries = entries
    .map((entry) => {
      const lastModified = formatDate(entry.lastModified);
      const lines = [`  <sitemap>`, `    <loc>${escapeXml(entry.url)}</loc>`];
      if (lastModified) {
        lines.push(`    <lastmod>${lastModified}</lastmod>`);
      }
      lines.push("  </sitemap>");
      return lines.join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</sitemapindex>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400"
    }
  });
}
