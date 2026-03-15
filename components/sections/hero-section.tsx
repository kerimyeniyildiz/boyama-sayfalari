import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type Category = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

type HeroSectionProps = {
  categories: Category[];
};

export function HeroSection({ categories }: HeroSectionProps) {
  return (
    <section className="container py-16">
      <div className="space-y-6">
        <h1 className="sr-only">Boyama sayfaları</h1>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-dark/20 bg-white px-4 py-2 text-sm text-brand-dark/70">
          <Sparkles className="h-4 w-4 text-brand-dark" />
          Yeni: Türkçe boyama koleksiyonları
        </span>
        <p
          className="text-4xl font-bold text-brand-dark md:text-5xl"
          aria-hidden="true"
        >
          Çocuklar için yaratıcı boyama dünyası
        </p>
        <p className="text-lg text-brand-dark/80">
          Kategorilere ve etiketlere göre filtrelenmiş, yazdırmaya hazır PDF
          boyama sayfaları. Hemen indir, renklendir ve paylaş.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button asChild size="lg">
            <Link href="/ara">Boyama Sayfası Ara</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/kategori/hayvanlar">Popüler Kategoriler</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.slice(0, 4).map((category) => (
            <Link
              key={category.id}
              href={`/kategori/${category.slug}`}
              className="group flex items-center justify-between rounded-2xl border border-brand-dark/10 bg-white px-5 py-4 transition hover:border-brand-dark/30 hover:shadow-card"
            >
              <div>
                <p className="text-base font-semibold text-brand-dark">
                  {category.name}
                </p>
                <p className="text-xs text-brand-dark/60">
                  {category.count} sayfa
                </p>
              </div>
              <span className="text-brand-dark/60 transition group-hover:text-brand-dark">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
