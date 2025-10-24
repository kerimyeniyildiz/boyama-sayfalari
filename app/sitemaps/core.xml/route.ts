import { buildSitemapResponse, type SitemapEntry } from "@/lib/sitemap-response";
import { getBaseUrl, getLatestContentUpdate } from "@/lib/sitemap-utils";

export const revalidate = 86400;

export async function GET(): Promise<Response> {
  const baseUrl = getBaseUrl();
  const lastModified = await getLatestContentUpdate();

  const entries: SitemapEntry[] = [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${baseUrl}/ara`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${baseUrl}/gizlilik-politikasi`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6
    },
    {
      url: `${baseUrl}/kullanim-sartlari`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6
    },
    {
      url: `${baseUrl}/iletisim`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5
    }
  ];

  return buildSitemapResponse(entries);
}
