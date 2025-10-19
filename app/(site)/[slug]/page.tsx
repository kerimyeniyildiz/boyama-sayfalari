import { notFound } from "next/navigation";

import { getColoringPageBySlug } from "@/lib/data/coloring-pages";
import { getPublicUrl } from "@/lib/r2";
import { buildCreativeWorkJsonLd, buildMetadata, siteConfig } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { ColoringPageDetail } from "@/components/sections/coloring-page-detail";

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

function formatSlugForTitle(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLocaleLowerCase("tr-TR");
      return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
    })
    .join(" ");
}

type PageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: PageProps) {
  const page = await getColoringPageBySlug(params.slug);

  const formattedSlug = formatSlugForTitle(params.slug);

  if (!page) {
    return buildMetadata({
      title: "Boyama sayfası bulunamadı",
      description: siteConfig.description,
      path: `/${params.slug}`
    });
  }

  const imageUrl = getPublicUrl(page.thumbWebpKey);
  const createdAt = normalizeDate(page.createdAt);
  const updatedAt = normalizeDate(page.updatedAt);

  const title = `${formattedSlug} Boyama Sayfaları - Yüksek Kalite PDF - (Ücretsiz)`;
  const description = `En güzel ${formattedSlug} boyama sayfalarını hemen indir! Ücretsiz, baskıya uygun ve eğlenceli ${formattedSlug} çizimleriyle boyamaya başla.`;

  return buildMetadata({
    title,
    description,
    path: `/${page.slug}`,
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
  const page = await getColoringPageBySlug(params.slug);

  if (!page || page.status !== "PUBLISHED") {
    notFound();
  }

  const pdfUrl = getPublicUrl(page.pdfKey);
  const imageUrl = getPublicUrl(page.thumbWebpKey);
  const createdAt = normalizeDate(page.createdAt);
  const updatedAt = normalizeDate(page.updatedAt);

  const jsonLd = buildCreativeWorkJsonLd({
    name: page.title,
    description: page.description,
    url: `${siteConfig.url}/${page.slug}`,
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
