import { buildSitemapIndexResponse } from "@/lib/sitemap-index-response";
import { getBaseUrl, getLatestContentUpdate } from "@/lib/sitemap-utils";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

export async function GET(): Promise<Response> {
  const baseUrl = getBaseUrl();
  const lastModified = await getLatestContentUpdate();

  return buildSitemapIndexResponse([
    {
      url: `${baseUrl}/sitemaps/core.xml`,
      lastModified
    },
    {
      url: `${baseUrl}/sitemaps/pages.xml`,
      lastModified
    },
    {
      url: `${baseUrl}/sitemaps/images.xml`,
      lastModified
    },
    {
      url: `${baseUrl}/sitemaps/categories.xml`,
      lastModified
    },
    {
      url: `${baseUrl}/sitemaps/tags.xml`,
      lastModified
    }
  ]);
}
