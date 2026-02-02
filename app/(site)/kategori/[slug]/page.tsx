import { notFound } from "next/navigation";

import { getCategoryWithPagesPaginated } from "@/lib/data/coloring-pages";
import { buildCollectionJsonLd, buildMetadata, siteConfig } from "@/lib/seo";
import { getPublicUrl } from "@/lib/r2";
import { buildColoringPageUrl } from "@/lib/page-paths";
import { JsonLd } from "@/components/seo/json-ld";
import { CategoryCollection } from "@/components/sections/category-collection";
import { paginationParamsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    slug: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

function parsePageParam(
  searchParams: PageProps["searchParams"]
): number {
  const parsed = paginationParamsSchema.safeParse({
    sayfa: Array.isArray(searchParams.sayfa)
      ? searchParams.sayfa[0]
      : searchParams.sayfa
  });
  return parsed.success ? parsed.data.sayfa : 1;
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const page = parsePageParam(searchParams);
  const categoryData = await getCategoryWithPagesPaginated(params.slug, page);
  if (!categoryData) {
    return buildMetadata({
      title: "Kategori bulunamadı",
      description: siteConfig.description,
      path: `/kategori/${params.slug}`
    });
  }

  return buildMetadata({
    title: `${categoryData.category.name} boyama sayfaları`,
    description: `${categoryData.category.name} kategorisindeki boyama sayfalarını indir.`,
    path: `/kategori/${categoryData.category.slug}`
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const page = parsePageParam(searchParams);
  const categoryData = await getCategoryWithPagesPaginated(params.slug, page);

  if (!categoryData) {
    notFound();
  }

  const jsonLd = buildCollectionJsonLd({
    name: `${categoryData.category.name} boyama koleksiyonu`,
    description: `${categoryData.category.name} kategorisindeki boyama sayfaları.`,
    url: `${siteConfig.url}/kategori/${categoryData.category.slug}`,
    items: categoryData.pages.map((page) => ({
      name: page.title,
      url: buildColoringPageUrl(page, siteConfig.url),
      image: getPublicUrl(page.thumbWebpKey),
      description: page.description
    }))
  });

  return (
    <>
      <CategoryCollection
        category={{
          ...categoryData.category,
          pages: categoryData.pages,
          total: categoryData.total,
          page: categoryData.page,
          pageSize: categoryData.pageSize
        }}
      />
      <JsonLd data={jsonLd} />
    </>
  );
}
