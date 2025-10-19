import type { Metadata } from "next";

import { env } from "@/lib/env";

type BuildMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  image?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

export const siteConfig = {
  name: env.NEXT_PUBLIC_SITE_NAME,
  url: env.NEXT_PUBLIC_SITE_URL,
  defaultLocale: env.NEXT_PUBLIC_DEFAULT_LOCALE,
  description:
    "Çocuklar için binlerce ücretsiz boyama sayfaları seni bekliyor. Renklerle hayal gücünü geliştir. Hemen yüksek kaliteli PDF boyama sayfasını indir, yazdır ve boya!"
};

export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime
}: BuildMetadataOptions): Metadata {
  const url = path ? new URL(path, siteConfig.url).toString() : siteConfig.url;

  return {
    title: {
      absolute: title
    },
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      type,
      siteName: siteConfig.name,
      locale: "tr_TR",
      ...(image
        ? {
            images: [
              {
                url: image.url,
                width: image.width,
                height: image.height,
                alt: image.alt ?? title
              }
            ]
          }
        : undefined),
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {})
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image.url] : undefined
    }
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: siteConfig.defaultLocale,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/ara?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function buildCollectionJsonLd(options: {
  name: string;
  description: string;
  url: string;
  items: Array<{
    name: string;
    url: string;
    image?: string;
    description?: string;
  }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: options.name,
    description: options.description,
    url: options.url,
    hasPart: options.items.map((item) => ({
      "@type": "CreativeWork",
      name: item.name,
      url: item.url,
      image: item.image,
      description: item.description
    }))
  };
}

export function buildCreativeWorkJsonLd(options: {
  name: string;
  description: string;
  url: string;
  pdfUrl: string;
  image: { url: string; width?: number; height?: number };
  keywords: string[];
  author?: string;
  license?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: options.name,
    description: options.description,
    url: options.url,
    image: {
      "@type": "ImageObject",
      url: options.image.url,
      width: options.image.width,
      height: options.image.height
    },
    encoding: {
      "@type": "MediaObject",
      contentUrl: options.pdfUrl,
      fileFormat: "application/pdf"
    },
    keywords: options.keywords,
    inLanguage: siteConfig.defaultLocale,
    author: options.author,
    license: options.license,
    datePublished: options.datePublished,
    dateModified: options.dateModified
  };
}
