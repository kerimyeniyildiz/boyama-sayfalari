import { ColoringPageCard } from "@/components/cards/coloring-page-card";
import type { ColoringPageWithRelations } from "@/lib/data/coloring-pages";

type LatestSectionProps = {
  pages: ColoringPageWithRelations[];
};

export function LatestSection({ pages }: LatestSectionProps) {
  if (pages.length === 0) {
    return null;
  }

  return (
    <section className="container py-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-brand-dark">
            Son eklenenler
          </h2>
          <p className="text-sm text-brand-dark/70">
            Her hafta yeni boyama sayfaları ekleniyor.
          </p>
        </div>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pages.slice(0, 6).map((page) => (
          <ColoringPageCard key={page.id} page={page} />
        ))}
      </div>
    </section>
  );
}
