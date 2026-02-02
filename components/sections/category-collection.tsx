import Link from "next/link";
import type { Category } from "@prisma/client";

import { ColoringPageCard } from "@/components/cards/coloring-page-card";
import { Button } from "@/components/ui/button";
import type { ColoringPageSummary } from "@/lib/data/coloring-pages";

type CategoryWithPages = Category & {
  pages: ColoringPageSummary[];
  total: number;
  page: number;
  pageSize: number;
};

type CategoryCollectionProps = {
  category: CategoryWithPages;
};

export function CategoryCollection({ category }: CategoryCollectionProps) {
  const totalPages = Math.max(1, Math.ceil(category.total / category.pageSize));
  const canGoPrev = category.page > 1;
  const canGoNext = category.page < totalPages;

  const buildPageQuery = (page: number) =>
    page > 1 ? { sayfa: page.toString() } : {};

  return (
    <section className="space-y-10 py-12">
      <div className="container">
        <h1 className="text-3xl font-semibold text-brand-dark">
          {category.name} boyama sayfaları
        </h1>
        <p className="text-sm text-brand-dark/70">
          {category.total} içerik listeleniyor.
        </p>
        <p className="text-xs text-brand-dark/50">
          Sayfa {category.page} / {totalPages}
        </p>
      </div>
      <div className="container grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {category.pages.map((page) => (
          <ColoringPageCard key={page.id} page={page} />
        ))}
      </div>
      <div className="container flex items-center justify-between">
        <div className="text-xs text-brand-dark/60">
          {category.page} / {totalPages}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild disabled={!canGoPrev}>
            <Link
              aria-disabled={!canGoPrev}
              href={
                canGoPrev
                  ? {
                      pathname: `/kategori/${category.slug}`,
                      query: buildPageQuery(category.page - 1)
                    }
                  : `/kategori/${category.slug}`
              }
            >
              Önceki
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild disabled={!canGoNext}>
            <Link
              aria-disabled={!canGoNext}
              href={
                canGoNext
                  ? {
                      pathname: `/kategori/${category.slug}`,
                      query: buildPageQuery(category.page + 1)
                    }
                  : `/kategori/${category.slug}`
              }
            >
              Sonraki
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
