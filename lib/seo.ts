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
    "Cocuklar icin ucretsiz ve kaliteli boyama sayfalari. Egitici, guvenli ve baskiya uygun iceriklerle ogrenmeyi eglenceli hale getiriyoruz."
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

type JsonLdAudience = {
  audienceType: string;
  educationalRole?: string;
};

type JsonLdAbout = {
  name: string;
  url?: string;
};

type JsonLdPublisher = {
  name: string;
  url: string;
  type?: "Organization" | "Person";
  logo?: { url: string; width?: number; height?: number };
};

type JsonLdCreator = {
  name: string;
  url?: string;
  type?: "Organization" | "Person";
};

type JsonLdImage = {
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  thumbnailUrl?: string;
};

type BuildCreativeWorkJsonLdOptions = {
  id?: string;
  name: string;
  alternateName?: string;
  description?: string | null;
  url: string;
  pdfUrl: string;
  image: JsonLdImage;
  keywords: string[];
  about?: JsonLdAbout[];
  genre?: string[];
  learningResourceType?: string | string[];
  audience?: JsonLdAudience[];
  ageRange?: string;
  isFamilyFriendly?: boolean;
  creator?: JsonLdCreator;
  publisher?: JsonLdPublisher;
  license?: string;
  datePublished?: string;
  dateModified?: string;
  creativeWorkStatus?: string;
  isAccessibleForFree?: boolean;
  contentSize?: number;
  encodingFormat?: string;
  sameAs?: string[];
  identifier?: string;
  citation?: string[];
};

function formatContentSize(bytes?: number): string | undefined {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return undefined;
  }

  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let value = bytes;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value < 10 && index > 0 ? 1 : 0)} ${units[index]}`;
}

export function buildCreativeWorkJsonLd(
  options: BuildCreativeWorkJsonLdOptions
) {
  const cleanedUrl = options.url.replace(/#.*$/, "");
  const id = options.id ?? `${cleanedUrl}#coloring-page`;
  const license =
    options.license ??
    new URL("/kullanim-sartlari", siteConfig.url).toString();
  const isFamilyFriendly =
    options.isFamilyFriendly === undefined ? true : options.isFamilyFriendly;
  const isAccessibleForFree =
    options.isAccessibleForFree === undefined
      ? true
      : options.isAccessibleForFree;
  const creativeWorkStatus = options.creativeWorkStatus ?? "Published";
  const keywords = Array.from(
    new Set(options.keywords.filter((keyword) => keyword && keyword.trim()))
  ).map((keyword) => keyword.trim());

  const about =
    options.about?.map((item) => ({
      "@type": "Thing",
      name: item.name,
      ...(item.url ? { url: item.url } : {})
    })) ?? [];

  const genre = options.genre ?? [];

  const audience =
    options.audience?.map((entry) => ({
      "@type": "Audience",
      audienceType: entry.audienceType,
      ...(entry.educationalRole
        ? { educationalRole: entry.educationalRole }
        : {})
    })) ??
    [
      {
        "@type": "Audience",
        audienceType: "Children"
      }
    ];

  const publisher: Record<string, unknown> = {
    "@type": options.publisher?.type ?? "Organization",
    name: options.publisher?.name ?? siteConfig.name,
    url: options.publisher?.url ?? siteConfig.url
  };

  if (options.publisher?.logo?.url) {
    publisher.logo = {
      "@type": "ImageObject",
      url: options.publisher.logo.url,
      width: options.publisher.logo.width,
      height: options.publisher.logo.height
    };
  } else {
    publisher.logo = {
      "@type": "ImageObject",
      url: new URL("/favicon.svg", siteConfig.url).toString()
    };
  }

  const creator =
    options.creator ?? {
      name: siteConfig.name,
      type: "Organization",
      url: siteConfig.url
    };

  const encodingFormat = options.encodingFormat ?? "application/pdf";
  const contentSizeLabel = formatContentSize(options.contentSize);

  return {
    "@context": "https://schema.org",
    "@type": ["CreativeWork", "VisualArtwork", "LearningResource"],
    "@id": id,
    mainEntityOfPage: cleanedUrl,
    name: options.name,
    ...(options.alternateName ? { alternateName: options.alternateName } : {}),
    description: options.description ?? "",
    url: cleanedUrl,
    identifier: options.identifier,
    inLanguage: siteConfig.defaultLocale,
    isFamilyFriendly,
    isAccessibleForFree,
    creativeWorkStatus,
    license,
    learningResourceType: options.learningResourceType ?? "ColoringWorksheet",
    typicalAgeRange: options.ageRange,
    keywords,
    about,
    genre,
    audience,
    image: {
      "@type": "ImageObject",
      url: options.image.url,
      width: options.image.width,
      height: options.image.height,
      caption: options.image.caption ?? options.name,
      representativeOfPage: true
    },
    thumbnailUrl: options.image.thumbnailUrl ?? options.image.url,
    encoding: {
      "@type": "MediaObject",
      contentUrl: options.pdfUrl,
      url: options.pdfUrl,
      encodingFormat,
      fileFormat: encodingFormat,
      name: `${options.name} PDF`,
      inLanguage: siteConfig.defaultLocale,
      isFamilyFriendly,
      ...(options.datePublished ? { datePublished: options.datePublished } : {}),
      ...(options.dateModified ? { dateModified: options.dateModified } : {}),
      ...(options.contentSize ? { byteSize: options.contentSize } : {}),
      ...(contentSizeLabel ? { contentSize: contentSizeLabel } : {})
    },
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
      url: options.pdfUrl,
      eligibleRegion: "TR",
      itemCondition: "https://schema.org/NewCondition"
    },
    datePublished: options.datePublished,
    dateModified: options.dateModified,
    publisher,
    provider: publisher,
    creator: {
      "@type": creator.type ?? "Organization",
      name: creator.name,
      ...(creator.url ? { url: creator.url } : {})
    },
    ...(options.sameAs && options.sameAs.length > 0
      ? { sameAs: options.sameAs }
      : {}),
    ...(options.citation && options.citation.length > 0
      ? { citation: options.citation }
      : {})
  };
}
