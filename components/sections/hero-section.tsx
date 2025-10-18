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
    <section className="container grid gap-10 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-dark/20 bg-white px-4 py-2 text-sm text-brand-dark/70">
          <Sparkles className="h-4 w-4 text-brand-dark" />
          Yeni: Turkce boyama koleksiyonlari
        </span>
        <h1 className="text-4xl font-bold text-brand-dark md:text-5xl">
          Cocuklar icin yaratici boyama dunyasi
        </h1>
        <p className="text-lg text-brand-dark/80">
          Kategorilere ve etiketlere gore filtrelenmis, yazdirmaya hazir PDF boyama sayfalari. Hemen indir, renklendir ve paylas.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button asChild size="lg">
            <Link href="/ara">Boyama Sayfasi Ara</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/kategori/hayvanlar">Populer Kategoriler</Link>
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
                ›
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative rounded-3xl border border-brand-dark/10 bg-white p-8 shadow-card">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-medium text-brand-dark/70">
                One cikiyor
              </p>
              <p className="text-2xl font-semibold text-brand-dark">
                150+ ozel boyama sayfasi
              </p>
            </div>
            <ul className="space-y-3 text-sm text-brand-dark/70">
              <li>PDF ve WebP formatlarinda hizli indirme</li>
              <li>Cloudflare R2 ile guvenli saklama</li>
              <li>Arama ve etiketlerle kolay filtreleme</li>
              <li>SEO ve performans icin optimize edildi</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
