import { notFound } from "next/navigation";
import { unstable_after } from "next/server";

import {
  getColoringPageBySlug,
  getRelatedPages,
  getAllPublishedSlugs,
  incrementViews
} from "@/lib/data/coloring-pages";
import { getPublicUrl } from "@/lib/r2";
import {
  buildCreativeWorkJsonLd,
  buildMetadata,
  siteConfig
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { ColoringPageDetail } from "@/components/sections/coloring-page-detail";

export const revalidate = 900;

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

type PageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: PageProps) {
  const page = await getColoringPageBySlug(params.slug);

  if (!page) {
    return buildMetadata({
      title: "Boyama sayfası bulunamadı",
      description: siteConfig.description,
      path: `/sayfa/${params.slug}`
    });
  }

  const imageUrl = getPublicUrl(page.thumbWebpKey);

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/sayfa/${page.slug}`,
    image: {
      url: imageUrl,
      width: page.width ?? undefined,
      height: page.height ?? undefined,
      alt: page.title
    },
    type: "article",
    publishedTime: page.createdAt.toISOString(),
    modifiedTime: page.updatedAt.toISOString()
  });
}

export default async function ColoringPageRoute({ params }: PageProps) {
  const page = await getColoringPageBySlug(params.slug);

  if (!page || page.status !== "PUBLISHED") {
    notFound();
  }

  unstable_after(async () => {
    await incrementViews(page.id);
  });

  const related = await getRelatedPages(
    page.slug,
    page.difficulty,
    page.orientation
  );

  const pdfUrl = getPublicUrl(page.pdfKey);
  const imageUrl = getPublicUrl(page.thumbWebpKey);

  const jsonLd = buildCreativeWorkJsonLd({
    name: page.title,
    description: page.description,
    url: `${siteConfig.url}/sayfa/${page.slug}`,
    pdfUrl,
    image: {
      url: imageUrl,
      width: page.width ?? undefined,
      height: page.height ?? undefined
    },
    keywords: [
      page.difficulty,
      page.orientation,
      ...page.categories.map((entry) => entry.category.name),
      ...page.tags.map((entry) => entry.tag.name)
    ],
    author: page.artist ?? undefined,
    license: page.license ?? undefined,
    datePublished: page.createdAt.toISOString(),
    dateModified: page.updatedAt.toISOString()
  });

  return (
    <>
      <ColoringPageDetail page={page} related={related} />
      <JsonLd data={jsonLd} />
    </>
  );
}
