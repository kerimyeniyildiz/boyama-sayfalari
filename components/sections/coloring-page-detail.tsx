import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import type { ColoringPageDetail } from "@/lib/data/coloring-pages";
import { FALLBACK_BLUR_DATA_URL } from "@/lib/placeholders";
import { getPublicUrl } from "@/lib/r2";

type PageEntry = {
  id: string;
  slug: string;
  title: string;
  pdfKey: string;
  coverImageKey: string | null;
  thumbWebpKey: string | null;
  width: number | null;
  height: number | null;
};

type DetailedPage =
  | ColoringPageDetail
  | ColoringPageDetail["children"][number]
  | NonNullable<ColoringPageDetail["parent"]>;

function toPageEntry(entry: DetailedPage): PageEntry {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    pdfKey: entry.pdfKey,
    coverImageKey: entry.coverImageKey,
    thumbWebpKey: entry.thumbWebpKey,
    width: entry.width,
    height: entry.height
  };
}

function resolveImageKeys(entry: PageEntry) {
  if (entry.thumbWebpKey) {
    const large = getPublicUrl(entry.thumbWebpKey);
    const blur = entry.thumbWebpKey.includes("-800.")
      ? getPublicUrl(entry.thumbWebpKey.replace("-800.", "-400."))
      : FALLBACK_BLUR_DATA_URL;
    return { large, blur, optimized: true } as const;
  }

  if (entry.coverImageKey) {
    const url = getPublicUrl(entry.coverImageKey);
    return { large: url, blur: url, optimized: true } as const;
  }

  return {
    large: FALLBACK_BLUR_DATA_URL,
    blur: FALLBACK_BLUR_DATA_URL,
    optimized: false
  } as const;
}

function buildExtraEntries(page: ColoringPageDetail): PageEntry[] {
  if (page.parent) {
    const siblings = page.parent.children
      .filter((child) => child.id !== page.id)
      .map((child) => toPageEntry(child));
    return [toPageEntry(page.parent), ...siblings];
  }

  return page.children.map((child) => toPageEntry(child));
}

export function ColoringPageDetail({ page }: { page: ColoringPageDetail }) {
  const primaryEntry = toPageEntry(page);
  const { large, blur, optimized } = resolveImageKeys(primaryEntry);
  const pdfRoute = `/api/download/${page.slug}` as Route;
  const extraEntries = buildExtraEntries(page);
  const isChild = Boolean(page.parent);

  return (
    <section className="container py-12">
      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-card">
          <Image
            src={large}
            alt={page.title}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-contain"
            placeholder="blur"
            blurDataURL={blur}
            unoptimized={!optimized}
          />
        </div>
        <div className="flex flex-col justify-between gap-8 rounded-3xl border border-brand-dark/10 bg-white/90 p-8 shadow-card">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-brand-dark">{page.title}</h1>
            <p className="text-brand-dark/70">{page.description}</p>
            <dl className="grid gap-2 text-sm text-brand-dark/70">
              <div className="flex gap-2">
                <dt className="min-w-[120px] font-medium text-brand-dark">Boyut</dt>
                <dd>
                  {primaryEntry.width ?? "?"}x{primaryEntry.height ?? "?"} px · {Math.round((page.fileSizeBytes ?? 0) / 1024)} KB
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="min-w-[120px] font-medium text-brand-dark">Kategoriler</dt>
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
                <dt className="min-w-[120px] font-medium text-brand-dark">Etiketler</dt>
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
              <Link href={pdfRoute}>📥 PDF indir</Link>
            </Button>
          </div>
        </div>
      </div>

      {extraEntries.length > 0 ? (
        <div className="mt-16 space-y-6">
          <h2 className="text-2xl font-semibold text-brand-dark">Ek boyama görselleri</h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {extraEntries.map((entry) => {
              if (isChild && entry.id === page.id) {
                return null;
              }

              const { large: entryImage, blur: entryBlur, optimized: entryOptimized } = resolveImageKeys(entry);

              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-card"
                >
                  <Link
                    href={`/${entry.slug}` as Route}
                    className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-brand-light"
                  >
                    <Image
                      src={entryImage}
                      alt={entry.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain"
                      placeholder="blur"
                      blurDataURL={entryBlur}
                      unoptimized={!entryOptimized}
                    />
                  </Link>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-base font-semibold text-brand-dark">{entry.title}</h3>
                    <Link
                      href={`/${entry.slug}` as Route}
                      className="text-center text-sm font-medium text-brand transition hover:text-brand-dark"
                    >
                      🎨 Boyama sayfasını indir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
