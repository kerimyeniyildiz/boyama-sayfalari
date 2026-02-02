import { notFound } from "next/navigation";

import { getTagWithPagesPaginated } from "@/lib/data/coloring-pages";
import { buildCollectionJsonLd, buildMetadata, siteConfig } from "@/lib/seo";
import { getPublicUrl } from "@/lib/r2";
import { buildColoringPageUrl } from "@/lib/page-paths";
import { JsonLd } from "@/components/seo/json-ld";
import { TagCollection } from "@/components/sections/tag-collection";
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
  const tagData = await getTagWithPagesPaginated(params.slug, page);

  if (!tagData) {
    return buildMetadata({
      title: "Etiket bulunamadı",
      description: siteConfig.description,
      path: `/etiket/${params.slug}`
    });
  }

  return buildMetadata({
    title: `${tagData.tag.name} boyama sayfaları`,
    description: `${tagData.tag.name} etiketiyle işaretlenmiş boyama sayfaları.`,
    path: `/etiket/${tagData.tag.slug}`
  });
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const page = parsePageParam(searchParams);
  const tagData = await getTagWithPagesPaginated(params.slug, page);

  if (!tagData) {
    notFound();
  }

  const jsonLd = buildCollectionJsonLd({
    name: `${tagData.tag.name} koleksiyonu`,
    description: `${tagData.tag.name} etiketli boyama sayfaları.`,
    url: `${siteConfig.url}/etiket/${tagData.tag.slug}`,
    items: tagData.pages.map((page) => ({
      name: page.title,
      url: buildColoringPageUrl(page, siteConfig.url),
      image: getPublicUrl(page.thumbWebpKey),
      description: page.description
    }))
  });

  return (
    <>
      <TagCollection
        tag={{
          ...tagData.tag,
          pages: tagData.pages,
          total: tagData.total,
          page: tagData.page,
          pageSize: tagData.pageSize
        }}
      />
      <JsonLd data={jsonLd} />
    </>
  );
}
