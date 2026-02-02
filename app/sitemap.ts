import { getBaseUrl, getLatestContentUpdate } from "@/lib/sitemap-utils";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

type SitemapIndexEntry = {
  url: string;
  lastModified: Date;
};

export default async function sitemap(): Promise<SitemapIndexEntry[]> {
  const baseUrl = getBaseUrl();
  const lastModified = await getLatestContentUpdate();
  return [
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
  ];
}
