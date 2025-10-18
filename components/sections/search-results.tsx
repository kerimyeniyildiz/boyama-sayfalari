import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ColoringPageCard } from "@/components/cards/coloring-page-card";
import type { ColoringPageSummary } from "@/lib/data/coloring-pages";

type Category = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

type Filters = {
  q?: string;
  kategori?: string;
  etiket?: string;
  yas?: number;
  sayfa: number;
};

type SearchResult = {
  results: ColoringPageSummary[];
  total: number;
  page: number;
  pageSize: number;
};

type SearchResultsProps = {
  filters: Filters;
  result: SearchResult;
  categories: Category[];
  tags: Tag[];
};

function buildQueryParams(params: Record<string, string | number | undefined>) {
  const query: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query[key] = String(value);
    }
  });
  return query;
}

const searchRoute = "/ara" as Route;

export function SearchResults({
  filters,
  result,
  categories,
  tags
}: SearchResultsProps) {
  if (!result) {
    notFound();
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <section className="container space-y-10 py-12">
      <div className="rounded-3xl border border-brand-dark/10 bg-white/90 p-6 shadow-card">
        <form className="grid gap-6" action={searchRoute} method="get">
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-brand-dark/80">
                Anahtar kelime
              </label>
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-brand-dark/40" />
                <Input
                  name="q"
                  defaultValue={filters.q}
                  placeholder="Örn. uzay, peri, hayvan"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-brand-dark/80">
                Kategori
              </label>
              <Select name="kategori" defaultValue={filters.kategori ?? ""}>
                <option value="">Tümü</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-brand-dark/80">
                Etiket
              </label>
              <Select name="etiket" defaultValue={filters.etiket ?? ""}>
                <option value="">Tümü</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    #{tag.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-brand-dark/80">
                Yaş
              </label>
              <Input
                type="number"
                min={0}
                max={18}
                name="yas"
                defaultValue={filters.yas}
                placeholder="7"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Filtrele</Button>
            <Button type="reset" variant="ghost" asChild>
              <Link href={searchRoute}>Filtreleri sıfırla</Link>
            </Button>
            <input type="hidden" name="sayfa" value="1" />
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-brand-dark/70">
            {result.total} sonuç bulundu.
          </p>
          <p className="text-xs text-brand-dark/50">
            Sayfa {result.page} / {totalPages}
          </p>
        </div>
        {result.results.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-dark/20 bg-white/70 p-10 text-center text-sm text-brand-dark/70">
            Aradığınız kriterlere uygun içerik bulunamadı. Farklı anahtar
            kelimeler veya filtreler deneyin.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {result.results.map((page) => (
              <ColoringPageCard key={page.id} page={page} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-brand-dark/60">
            {result.page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={result.page <= 1}
            >
              <Link
                aria-disabled={result.page <= 1}
                href={{
                  pathname: searchRoute,
                  query: buildQueryParams({
                    ...filters,
                    sayfa: result.page - 1 <= 0 ? 1 : result.page - 1
                  })
                }}
              >
                Önceki
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={result.page >= totalPages}
            >
              <Link
                aria-disabled={result.page >= totalPages}
                href={{
                  pathname: searchRoute,
                  query: buildQueryParams({
                    ...filters,
                    sayfa: result.page + 1
                  })
                }}
              >
                Sonraki
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

