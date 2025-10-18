import { notFound } from "next/navigation";

import { getTagWithPages } from "@/lib/data/coloring-pages";
import { buildCollectionJsonLd, buildMetadata, siteConfig } from "@/lib/seo";
import { getPublicUrl } from "@/lib/r2";
import { JsonLd } from "@/components/seo/json-ld";
import { TagCollection } from "@/components/sections/tag-collection";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: PageProps) {
  const tag = await getTagWithPages(params.slug);

  if (!tag) {
    return buildMetadata({
      title: "Etiket bulunamadı",
      description: siteConfig.description,
      path: `/etiket/${params.slug}`
    });
  }

  return buildMetadata({
    title: `${tag.name} boyama sayfaları`,
    description: `${tag.name} etiketiyle işaretlenmiş boyama sayfaları.`,
    path: `/etiket/${tag.slug}`
  });
}

export default async function TagPage({ params }: PageProps) {
  const tag = await getTagWithPages(params.slug);

  if (!tag) {
    notFound();
  }

  const jsonLd = buildCollectionJsonLd({
    name: `${tag.name} koleksiyonu`,
    description: `${tag.name} etiketli boyama sayfaları.`,
    url: `${siteConfig.url}/etiket/${tag.slug}`,
    items: tag.pages.map((page) => ({
      name: page.title,
      url: `${siteConfig.url}/${page.slug}`,
      image: getPublicUrl(page.thumbWebpKey),
      description: page.description
    }))
  });

  return (
    <>
      <TagCollection tag={tag} />
      <JsonLd data={jsonLd} />
    </>
  );
}
