import type { MetadataRoute } from "next";

import { getBaseUrl, getLatestContentUpdate } from "@/lib/sitemap-utils";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const lastModified = await getLatestContentUpdate();

  return [
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
    }
  ];
}
