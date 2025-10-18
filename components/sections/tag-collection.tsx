import type { Tag } from "@prisma/client";

import { ColoringPageCard } from "@/components/cards/coloring-page-card";
import type { ColoringPageWithRelations } from "@/lib/data/coloring-pages";

type TagWithPages = Tag & {
  pages: ColoringPageWithRelations[];
};

type TagCollectionProps = {
  tag: TagWithPages;
};

export function TagCollection({ tag }: TagCollectionProps) {
  return (
    <section className="space-y-10 py-12">
      <div className="container">
        <h1 className="text-3xl font-semibold text-brand-dark">
          #{tag.name} boyama sayfaları
        </h1>
        <p className="text-sm text-brand-dark/70">
          {tag.pages.length} sonuç bulundu.
        </p>
      </div>
      <div className="container grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tag.pages.map((page) => (
          <ColoringPageCard key={page.id} page={page} />
        ))}
      </div>
    </section>
  );
}
