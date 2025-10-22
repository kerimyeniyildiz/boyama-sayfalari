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
