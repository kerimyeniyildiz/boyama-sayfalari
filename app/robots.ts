import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/admin"]
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
