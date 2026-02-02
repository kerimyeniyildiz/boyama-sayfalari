import { notFound } from "next/navigation";

import { getCategoryWithPages } from "@/lib/data/coloring-pages";
import { buildCollectionJsonLd, buildMetadata, siteConfig } from "@/lib/seo";
import { getPublicUrl } from "@/lib/r2";
import { buildColoringPageUrl } from "@/lib/page-paths";
import { JsonLd } from "@/components/seo/json-ld";
import { CategoryCollection } from "@/components/sections/category-collection";

export const revalidate = 86400;

type PageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: PageProps) {
  const category = await getCategoryWithPages(params.slug);
  if (!category) {
    return buildMetadata({
      title: "Kategori bulunamadı",
      description: siteConfig.description,
      path: `/kategori/${params.slug}`
    });
  }

  return buildMetadata({
    title: `${category.name} boyama sayfaları`,
    description: `${category.name} kategorisindeki boyama sayfalarını indir.`,
    path: `/kategori/${category.slug}`
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const category = await getCategoryWithPages(params.slug);

  if (!category) {
    notFound();
  }

  const jsonLd = buildCollectionJsonLd({
    name: `${category.name} boyama koleksiyonu`,
    description: `${category.name} kategorisindeki boyama sayfaları.`,
    url: `${siteConfig.url}/kategori/${category.slug}`,
    items: category.pages.map((page) => ({
      name: page.title,
      url: buildColoringPageUrl(page, siteConfig.url),
      image: getPublicUrl(page.thumbWebpKey),
      description: page.description
    }))
  });

  return (
    <>
      <CategoryCollection category={category} />
      <JsonLd data={jsonLd} />
    </>
  );
}
