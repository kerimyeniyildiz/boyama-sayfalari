import { ColoringPageCard } from "@/components/cards/coloring-page-card";
import type { ColoringPageWithRelations } from "@/lib/data/coloring-pages";

type FeaturedGridProps = {
  pages: ColoringPageWithRelations[];
};

export function FeaturedGrid({ pages }: FeaturedGridProps) {
  if (pages.length === 0) {
    return null;
  }

  return (
    <section className="container py-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-brand-dark">
            Popüler boyama sayfaları
          </h2>
          <p className="text-sm text-brand-dark/70">
            En çok indirilen ve sevilen içerikler.
          </p>
        </div>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((page, index) => (
          <ColoringPageCard
            key={page.id}
            page={page}
            priority={index < 2}
          />
        ))}
      </div>
    </section>
  );
}
