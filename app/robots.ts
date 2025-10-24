import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url.replace(/\/$/, "");
  return {
    host: baseUrl,
    sitemap: [`${baseUrl}/sitemap.xml`],
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/gizlilik-politikasi", "/kullanim-sartlari", "/iletisim"],
        disallow: ["/admin", "/api/admin", "/api/internal"]
      }
    ]
  };
}
