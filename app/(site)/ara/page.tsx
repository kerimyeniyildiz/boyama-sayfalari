import { redirect } from "next/navigation";

import {
  getCategoriesWithCounts,
  getTagsWithCounts
} from "@/lib/data/coloring-pages";
import { searchColoringPages } from "@/lib/search";
import { buildMetadata, siteConfig } from "@/lib/seo";
import { searchParamsSchema } from "@/lib/validation";
import { SearchResults } from "@/components/sections/search-results";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const parsed = searchParamsSchema.safeParse({
    ...searchParams,
    q: Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q,
    kategori: Array.isArray(searchParams.kategori)
      ? searchParams.kategori[0]
      : searchParams.kategori,
    etiket: Array.isArray(searchParams.etiket)
      ? searchParams.etiket[0]
      : searchParams.etiket
  });

  const query = parsed.success ? parsed.data.q : undefined;
  const suffix = query ? `${query} araması` : "Boyama sayfası arama";

  return buildMetadata({
    title: `${suffix} | ${siteConfig.name}`,
    description:
      "Boyama sayfalarını kategori ve etiket filtreleriyle hızlıca bul.",
    path: "/ara"
  });
}

export default async function SearchPage({ searchParams }: PageProps) {
  const parsed = searchParamsSchema.safeParse({
    ...searchParams,
    q: Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q,
    kategori: Array.isArray(searchParams.kategori)
      ? searchParams.kategori[0]
      : searchParams.kategori,
    etiket: Array.isArray(searchParams.etiket)
      ? searchParams.etiket[0]
      : searchParams.etiket
  });

  if (!parsed.success) {
    redirect("/ara");
  }

  const filters = parsed.data;

  const [results, categories, tags] = await Promise.all([
    searchColoringPages({
      q: filters.q,
      categorySlug: filters.kategori,
      tagSlug: filters.etiket,
      age: filters.yas,
      page: filters.sayfa
    }),
    getCategoriesWithCounts(),
    getTagsWithCounts(30)
  ]);

  return (
    <SearchResults
      filters={filters}
      result={results}
      categories={categories}
      tags={tags}
    />
  );
}
