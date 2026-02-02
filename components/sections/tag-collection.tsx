import Link from "next/link";
import type { Tag } from "@prisma/client";

import { ColoringPageCard } from "@/components/cards/coloring-page-card";
import { Button } from "@/components/ui/button";
import type { ColoringPageSummary } from "@/lib/data/coloring-pages";

type TagWithPages = Tag & {
  pages: ColoringPageSummary[];
  total: number;
  page: number;
  pageSize: number;
};

type TagCollectionProps = {
  tag: TagWithPages;
};

export function TagCollection({ tag }: TagCollectionProps) {
  const totalPages = Math.max(1, Math.ceil(tag.total / tag.pageSize));
  const canGoPrev = tag.page > 1;
  const canGoNext = tag.page < totalPages;

  const buildPageQuery = (page: number) =>
    page > 1 ? { sayfa: page.toString() } : {};

  return (
    <section className="space-y-10 py-12">
      <div className="container">
        <h1 className="text-3xl font-semibold text-brand-dark">
          #{tag.name} boyama sayfaları
        </h1>
        <p className="text-sm text-brand-dark/70">
          {tag.total} sonuç bulundu.
        </p>
        <p className="text-xs text-brand-dark/50">
          Sayfa {tag.page} / {totalPages}
        </p>
      </div>
      <div className="container grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tag.pages.map((page) => (
          <ColoringPageCard key={page.id} page={page} />
        ))}
      </div>
      <div className="container flex items-center justify-between">
        <div className="text-xs text-brand-dark/60">
          {tag.page} / {totalPages}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild disabled={!canGoPrev}>
            <Link
              aria-disabled={!canGoPrev}
              href={
                canGoPrev
                  ? {
                      pathname: `/etiket/${tag.slug}`,
                      query: buildPageQuery(tag.page - 1)
                    }
                  : `/etiket/${tag.slug}`
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
                      pathname: `/etiket/${tag.slug}`,
                      query: buildPageQuery(tag.page + 1)
                    }
                  : `/etiket/${tag.slug}`
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
