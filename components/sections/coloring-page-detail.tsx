import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type {
  ColoringPage,
  ColoringPageCategory,
  ColoringPageTag
} from "@prisma/client";
import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ColoringPageCard } from "@/components/cards/coloring-page-card";
import { getPublicUrl } from "@/lib/r2";

type ColoringPageWithRelations = ColoringPage & {
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
};

type Props = {
  page: ColoringPageWithRelations;
  related: ColoringPageWithRelations[];
};

export function ColoringPageDetail({ page, related }: Props) {
  const imageLarge = getPublicUrl(page.thumbWebpKey);
  const imageSmall = imageLarge.replace("-800.webp", "-400.webp");
  const pdfRoute = `/api/download/${page.slug}` as Route;

  return (
    <section className="container py-12">
      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-card">
          <Image
            src={imageLarge}
            alt={page.title}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-contain"
            placeholder="blur"
            blurDataURL={imageSmall}
          />
        </div>
        <div className="flex flex-col justify-between gap-8 rounded-3xl border border-brand-dark/10 bg-white/90 p-8 shadow-card">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-brand-dark">
              {page.title}
            </h1>
            <p className="text-brand-dark/70">{page.description}</p>
            <dl className="grid gap-2 text-sm text-brand-dark/70">
              <div className="flex gap-2">
                <dt className="min-w-[120px] font-medium text-brand-dark">
                  Boyut
                </dt>
                <dd>
                  {page.width ?? "?"}x{page.height ?? "?"} px ·
                  {" "}
                  {Math.round((page.fileSizeBytes ?? 0) / 1024)} KB
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="min-w-[120px] font-medium text-brand-dark">
                  Kategoriler
                </dt>
                <dd className="flex flex-wrap gap-2">
                  {page.categories.map((category) => (
                    <Link
                      key={category.category.id}
                      href={`/kategori/${category.category.slug}` as Route}
                      className="rounded-full border border-brand-dark/20 px-3 py-1 text-xs text-brand-dark/70 transition hover:border-brand-dark/40 hover:text-brand-dark"
                    >
                      {category.category.name}
                    </Link>
                  ))}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="min-w-[120px] font-medium text-brand-dark">
                  Etiketler
                </dt>
                <dd className="flex flex-wrap gap-2">
                  {page.tags.map((tag) => (
                    <Link
                      key={tag.tag.id}
                      href={`/etiket/${tag.tag.slug}` as Route}
                      className="rounded-full bg-brand-light px-3 py-1 text-xs text-brand-dark/70 transition hover:bg-brand"
                    >
                      #{tag.tag.name}
                    </Link>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <Link href={pdfRoute}>
                <FileDown className="mr-2 h-5 w-5" />
                PDF indir
              </Link>
            </Button>
            <p className="text-xs text-brand-dark/60">
              İndirme linki Cloudflare R2 ile güvenli şekilde yönlendirilir.
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-brand-dark">
            Benzer boyama sayfaları
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {related.slice(0, 3).map((pageItem) => (
              <ColoringPageCard key={pageItem.id} page={pageItem} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
