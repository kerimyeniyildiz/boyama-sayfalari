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

type PageProps = {
  params: {
    slug?: string[];
  };
};

function extractSlugParams(params: PageProps["params"]) {
  const segments = params.slug ?? [];

  if (!Array.isArray(segments) || segments.length === 0 || segments.length > 2) {
    return null;
  }

  const childSlug = segments[segments.length - 1];
  const parentSlug = segments.length === 2 ? segments[0] : null;

  return { childSlug, parentSlug };
}

export async function generateMetadata({ params }: PageProps) {
  const slugParams = extractSlugParams(params);

  if (!slugParams) {
    return buildMetadata({
      title: "Boyama sayfası bulunamadı",
      description: siteConfig.description,
      path: "/"
    });
  }

  const page = await getColoringPageBySlug(slugParams.childSlug);

  if (!page) {
    return buildMetadata({
      title: "Boyama sayfası bulunamadı",
      description: siteConfig.description,
      path: `/${slugParams.childSlug}`
    });
  }

  if (
    slugParams.parentSlug &&
    page.parent?.slug !== slugParams.parentSlug
  ) {
    return buildMetadata({
      title: "Boyama sayfası bulunamadı",
      description: siteConfig.description,
      path: `/${slugParams.parentSlug}/${slugParams.childSlug}`
    });
  }

  const path = buildColoringPagePath(page);
  const imageUrl = getPublicUrl(page.thumbWebpKey);
  const createdAt = normalizeDate(page.createdAt);
  const updatedAt = normalizeDate(page.updatedAt);
  const baseTitle = page.title.trim().length > 0 ? page.title.trim() : page.slug;
  const title = `${baseTitle} Boyama Sayfası - Yüksek Kalite PDF - (Ücretsiz)`;
  const description = `En güzel ${baseTitle} boyama sayfalarını hemen indir! Ücretsiz, yazdırmaya uygun ve eğlenceli ${baseTitle} çizimlerini boyamaya başla.`;

  return buildMetadata({
    title,
    description,
    path,
    image: {
      url: imageUrl,
      width: page.width ?? undefined,
      height: page.height ?? undefined,
      alt: page.title
    },
    type: "article",
    publishedTime: createdAt?.toISOString(),
    modifiedTime: updatedAt?.toISOString()
  });
}

export default async function ColoringPageRoute({ params }: PageProps) {
  const slugParams = extractSlugParams(params);

  if (!slugParams) {
    notFound();
  }

  const { childSlug, parentSlug } = slugParams;
  const page = await getColoringPageBySlug(childSlug);

  if (!page || page.status !== "PUBLISHED") {
    notFound();
  }

  const canonicalPath = buildColoringPagePath(page);

  if (parentSlug && page.parent?.slug !== parentSlug) {
    notFound();
  }

  if (!parentSlug && page.parent?.slug) {
    redirect(canonicalPath);
  }

  const pdfUrl = getPublicUrl(page.pdfKey);
  const imageUrl = getPublicUrl(page.thumbWebpKey);
  const createdAt = normalizeDate(page.createdAt);
  const updatedAt = normalizeDate(page.updatedAt);
  const canonicalUrl = buildColoringPageUrl(page, siteConfig.url);

  const jsonLd = buildCreativeWorkJsonLd({
    name: page.title,
    description: page.description,
    url: canonicalUrl,
    pdfUrl,
    image: {
      url: imageUrl,
      width: page.width ?? undefined,
      height: page.height ?? undefined
    },
    keywords: [
      ...page.categories.map((entry) => entry.category.name),
      ...page.tags.map((entry) => entry.tag.name)
    ],
    datePublished: createdAt?.toISOString(),
    dateModified: updatedAt?.toISOString()
  });

  return (
    <>
      <ColoringPageDetail page={page} />
      <JsonLd data={jsonLd} />
    </>
  );
}
