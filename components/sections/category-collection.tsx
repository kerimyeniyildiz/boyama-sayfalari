import type {
  Category,
  ColoringPage,
  ColoringPageCategory,
  ColoringPageTag
} from "@prisma/client";

import { ColoringPageCard } from "@/components/cards/coloring-page-card";

type CategoryWithPages = Category & {
  pages: Array<
    ColoringPage & {
      categories: Array<
        ColoringPageCategory & {
          category: { id: string; name: string; slug: string };
        }
      >;
      tags: Array<
        ColoringPageTag & {
          tag: { id: string; name: string; slug: string };
        }
      >;
    }
  >;
};

type CategoryCollectionProps = {
  category: CategoryWithPages;
};

export function CategoryCollection({ category }: CategoryCollectionProps) {
  return (
    <section className="space-y-10 py-12">
      <div className="container">
        <h1 className="text-3xl font-semibold text-brand-dark">
          {category.name} boyama sayfaları
        </h1>
        <p className="text-sm text-brand-dark/70">
          {category.pages.length} içerik listeleniyor.
        </p>
      </div>
      <div className="container grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {category.pages.map((page) => (
          <ColoringPageCard key={page.id} page={page} />
        ))}
      </div>
    </section>
  );
}
