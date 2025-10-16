import Link from "next/link";

type Category = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

type CategorySectionProps = {
  categories: Category[];
};

export function CategorySection({ categories }: CategorySectionProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="container py-12">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-brand-dark">
            Kategorilere göre keşfet
          </h2>
          <p className="text-sm text-brand-dark/70">
            Çocuğunuzun ilgisine göre koleksiyonlara göz atın.
          </p>
        </div>
        <Link
          href="/ara"
          className="text-sm font-medium text-brand-dark hover:text-brand"
        >
          Tüm kategorileri gör →
        </Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.slice(0, 8).map((category) => (
          <Link
            key={category.id}
            href={`/kategori/${category.slug}`}
            className="group flex flex-col rounded-3xl border border-brand-dark/10 bg-white px-5 py-6 shadow-sm transition hover:-translate-y-1 hover:shadow-card"
          >
            <span className="text-lg font-semibold text-brand-dark">
              {category.name}
            </span>
            <span className="text-sm text-brand-dark/60">
              {category.count} içerik
            </span>
            <span className="mt-4 text-sm text-brand-dark/70 transition group-hover:text-brand-dark">
              Keşfet →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
