import { notFound, redirect } from "next/navigation";

import { getColoringPageBySlug } from "@/lib/data/coloring-pages";
import { getPublicUrl } from "@/lib/r2";
import { buildCreativeWorkJsonLd, buildMetadata, siteConfig } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { ColoringPageDetail } from "@/components/sections/coloring-page-detail";
import { buildColoringPagePath, buildColoringPageUrl } from "@/lib/page-paths";

export const dynamic = "force-dynamic";

function normalizeDate(
  value: Date | string | null | undefined
): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatAgeRange(
  ageMin?: number | null,
  ageMax?: number | null
): string | undefined {
  const min = typeof ageMin === "number" && ageMin > 0 ? ageMin : undefined;
  const max = typeof ageMax === "number" && ageMax > 0 ? ageMax : undefined;

  if (min && max) {
    return `${min}-${max}`;
  }
  if (min) {
    return `${min}+`;
  }
  if (max) {
    return `0-${max}`;
  }
  return undefined;
}

type PageProps = {
  params: {
    slug?: string[];
  };
};

function resolveSlugParams(params: PageProps["params"]) {
  const segments = params.slug ?? [];

  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  const [primarySlug, ...extraSegments] = segments;

  return { primarySlug, extraSegments };
}

export async function generateMetadata({ params }: PageProps) {
  const slugParams = resolveSlugParams(params);

  if (!slugParams) {
    return buildMetadata({
      title: "Boyama sayfası bulunamadı",
      description: siteConfig.description,
      path: "/"
    });
  }

  const { primarySlug } = slugParams;
  const page = await getColoringPageBySlug(primarySlug);

  if (!page) {
    return buildMetadata({
      title: "Boyama sayfası bulunamadı",
      description: siteConfig.description,
      path: `/${primarySlug}`
    });
  }

  const metadataPage = page.parent ?? page;
  const path = buildColoringPagePath(metadataPage);
  const imageUrl = getPublicUrl(metadataPage.thumbWebpKey);
  const createdAt = normalizeDate(metadataPage.createdAt);
  const updatedAt = normalizeDate(metadataPage.updatedAt);
  const baseTitle =
    metadataPage.title.trim().length > 0
      ? metadataPage.title.trim()
      : metadataPage.slug;
  const title = `${baseTitle} Boyama Sayfaları - Yüksek Kalite PDF - (Ücretsiz)`;
  const manualDescription = metadataPage.description?.trim();
  const fallbackDescription = `En güzel ${baseTitle} boyama sayfalarını hemen indir! Ücretsiz, yazdırmaya uygun ve eğlenceli çizimlerimizi boyamaya başla.`;
  const description =
    manualDescription && manualDescription.length > 0
      ? manualDescription
      : fallbackDescription;

  return buildMetadata({
    title,
    description,
    path,
    image: {
      url: imageUrl,
      width: metadataPage.width ?? undefined,
      height: metadataPage.height ?? undefined,
      alt: metadataPage.title
    },
    type: "article",
    publishedTime: createdAt?.toISOString(),
    modifiedTime: updatedAt?.toISOString()
  });
}

export default async function ColoringPageRoute({ params }: PageProps) {
  const slugParams = resolveSlugParams(params);

  if (!slugParams) {
    notFound();
  }

  const { primarySlug, extraSegments } = slugParams;

  if (extraSegments.length > 0) {
    redirect(`/${primarySlug}`);
  }

  const page = await getColoringPageBySlug(primarySlug);

  if (!page || page.status !== "PUBLISHED") {
    notFound();
  }

  if (page.parent?.slug) {
    redirect(buildColoringPagePath(page));
  }

  const pdfUrl = getPublicUrl(page.pdfKey);
  const imageUrl = getPublicUrl(page.thumbWebpKey);
  const createdAt = normalizeDate(page.createdAt);
  const updatedAt = normalizeDate(page.updatedAt);
  const canonicalUrl = buildColoringPageUrl(page, siteConfig.url);
  const manualDescription = page.description?.trim();
  const fallbackDescription = `En guzel ${page.title} boyama sayfalarini hemen indir ve renklendir. Ucretsiz PDF dosyalarini yazdir, cocuklarin yaraticiligini destekle.`;
  const description =
    manualDescription && manualDescription.length > 0
      ? manualDescription
      : fallbackDescription;
  const keywordSet = new Set<string>(
    [
      page.title,
      page.slug,
      ...page.categories.map((entry) => entry.category.name),
      ...page.tags.map((entry) => entry.tag.name)
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
  );
  const keywords = Array.from(keywordSet);
  const aboutEntries = new Map<string, { name: string; url?: string }>();

  page.categories.forEach((entry) => {
    const name = entry.category.name.trim();
    if (!aboutEntries.has(name)) {
      aboutEntries.set(name, {
        name,
        url: new URL(
          `/kategori/${entry.category.slug}`,
          siteConfig.url
        ).toString()
      });
    }
  });

  page.tags.forEach((entry) => {
    const name = entry.tag.name.trim();
    if (!aboutEntries.has(name)) {
      aboutEntries.set(name, {
        name,
        url: new URL(`/etiket/${entry.tag.slug}`, siteConfig.url).toString()
      });
    }
  });

  const genre = page.categories
    .map((entry) => entry.category.name.trim())
    .filter((value) => value.length > 0);

  const creator =
    page.artist && page.artist.trim().length > 0
      ? {
          name: page.artist.trim(),
          type: "Person" as const
        }
      : undefined;

  const ageRange = formatAgeRange(page.ageMin, page.ageMax);
  const license =
    page.license && page.license.trim().length > 0
      ? page.license.trim()
      : new URL("/kullanim-sartlari", siteConfig.url).toString();
  const sameAs =
    page.sourceUrl && page.sourceUrl.trim().length > 0
      ? [page.sourceUrl.trim()]
      : undefined;
  const citation =
    page.sourceUrl && page.sourceUrl.trim().length > 0
      ? [page.sourceUrl.trim()]
      : undefined;

  const jsonLd = buildCreativeWorkJsonLd({
    id: `${canonicalUrl}#coloring-page`,
    name: page.title,
    alternateName: `${page.title} boyama sayfasi`,
    description,
    url: canonicalUrl,
    pdfUrl,
    image: {
      url: imageUrl,
      width: page.width ?? undefined,
      height: page.height ?? undefined,
      caption: description
    },
    keywords,
    about: Array.from(aboutEntries.values()),
    genre,
    learningResourceType: ["ColoringWorksheet", "Activity"],
    audience: [
      { audienceType: "Children" },
      { audienceType: "Parents", educationalRole: "supporter" }
    ],
    ageRange,
    isFamilyFriendly: true,
    creator,
    license,
    datePublished: createdAt?.toISOString(),
    dateModified: updatedAt?.toISOString(),
    creativeWorkStatus: "Published",
    isAccessibleForFree: true,
    contentSize: page.fileSizeBytes ?? undefined,
    encodingFormat: "application/pdf",
    sameAs,
    identifier: page.slug,
    citation
  });

  return (
    <>
      <ColoringPageDetail page={page} />
      <JsonLd data={jsonLd} />
    </>
  );
}
