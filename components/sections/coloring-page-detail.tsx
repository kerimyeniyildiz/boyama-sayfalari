"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowDownToLine, FileDown, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ColoringPageDetail } from "@/lib/data/coloring-pages";
import { FALLBACK_BLUR_DATA_URL } from "@/lib/placeholders";
import { buildColoringPagePath } from "@/lib/page-paths";
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
  parentSlug?: string | null;
};

type DetailedPage =
  | ColoringPageDetail
  | ColoringPageDetail["children"][number]
  | NonNullable<ColoringPageDetail["parent"]>;

function toPageEntry(
  entry: DetailedPage,
  parentSlug?: string | null
): PageEntry {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    pdfKey: entry.pdfKey,
    coverImageKey: entry.coverImageKey,
    thumbWebpKey: entry.thumbWebpKey,
    width: entry.width,
    height: entry.height,
    parentSlug
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
    const parentSlug = page.parent.slug ?? null;
    const siblings = page.parent.children
      .filter((child) => child.id !== page.id)
      .map((child) => toPageEntry(child, parentSlug));
    return [toPageEntry(page.parent, null), ...siblings];
  }

  return page.children.map((child) => toPageEntry(child, page.slug));
}

const seoContentClassName =
  "space-y-3 text-brand-dark/75 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-brand-dark [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-brand-dark [&_p]:leading-relaxed [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5";

export function ColoringPageDetail({ page }: { page: ColoringPageDetail }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
    slug: string;
  } | null>(null);

  const primaryEntry = toPageEntry(page);
  const { large, blur, optimized } = resolveImageKeys(primaryEntry);
  const pdfRoute = `/api/download/${page.slug}` as Route;
  const extraEntries = buildExtraEntries(page);
  const isChild = Boolean(page.parent);
  const isMainPage = !isChild;
  const seoContentMarkup = page.seoContent?.trim() ?? "";
  const hasSeoContent = isMainPage && seoContentMarkup.length > 0;

  const openLightbox = (src: string, alt: string, slug: string) => {
    setLightboxImage({ src, alt, slug });
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setTimeout(() => setLightboxImage(null), 300);
  };

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
            <h1 className="text-3xl font-semibold text-brand-dark">
              {page.title} Boyama Sayfaları
            </h1>
            <div className="space-y-3 text-brand-dark/70">
              <p>{page.description}</p>
              <div className="space-y-3 bg-white/70 text-xs leading-relaxed md:text-[0.85rem]">
                <p>
                  Hayal gücünü serbest bırak! Ücretsiz, yüksek çözünürlüklü boyama
                  sayfalarımızı indir, yazdır ve dilediğin renklerle canlandır.
                </p>
                <div className="space-y-1">
                  <p className="font-semibold text-brand-dark">⬇️ Nasıl İndirilir?</p>
                  <div className="space-y-1">
                    <p>PDF indir düğmesine tıkla. 🖱️</p>
                    <p>Açılan dosyada İndir / Kaydet seçeneğini seç. 💾</p>
                    <p>A4 yazdır 🖨️ veya tablette/telefonda dijital boya 📱.</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-brand-dark">💡 İpucu</p>
                  <div className="space-y-1">
                    <p>
                      Kalın alanlar için keçeli 🖊️, detaylar için ince uçlu kalem kullan.
                    </p>
                    <p>Bitirdiğinde adını ve tarihi eklemeyi unutma. 📝</p>
                  </div>
                </div>
              </div>
            </div>
            <dl className="grid gap-2 text-sm text-brand-dark/70">
              <div className="flex gap-2">
                <dt className="min-w-[120px] font-medium text-brand-dark">Boyut</dt>
                <dd>
                  {primaryEntry.width ?? "?"}×{primaryEntry.height ?? "?"} px ·{" "}
                  {Math.round((page.fileSizeBytes ?? 0) / 1024)} KB
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
                      className="rounded-full bg-brand-light px-3 py-1 text-xs text-brand-dark/70 transition hover:bg-brand hover:text-white"
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
              <Link
                href={pdfRoute}
                className="flex items-center justify-center gap-2"
              >
                <FileDown className="h-5 w-5" />
                PDF indir
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {extraEntries.length > 0 ? (
        <div className="mt-16 space-y-6">
          {hasSeoContent ? (
            <div
              className={seoContentClassName}
              dangerouslySetInnerHTML={{ __html: seoContentMarkup }}
            />
          ) : null}
          <p className="text-2xl font-semibold text-brand-dark">
            Boyama sayfalarını keşfet:
          </p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {extraEntries.map((entry) => {
              if (isChild && entry.id === page.id) {
                return null;
              }

              const entryHref = buildColoringPagePath(entry);
              const {
                large: entryImage,
                blur: entryBlur,
                optimized: entryOptimized
              } = resolveImageKeys(entry);

              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-card"
                >
                  <button
                    onClick={() => openLightbox(entryImage, entry.title, entry.slug)}
                    className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-brand-light cursor-pointer transition-transform hover:scale-[1.02]"
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
                  </button>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-center text-base font-semibold text-brand-dark">
                      {entry.title}
                    </h3>
                    <div className="flex items-center justify-center">
                      <Button
                        size="sm"
                        onClick={() => openLightbox(entryImage, entry.title, entry.slug)}
                        className="flex items-center gap-2"
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                        PDF indir
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Lightbox Modal */}
      {lightboxOpen && lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Kapat"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="flex max-h-[90vh] max-w-4xl flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-white">
              <Image
                src={lightboxImage.src}
                alt={lightboxImage.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 80vw"
                className="object-contain"
                unoptimized
              />
            </div>
            <Button asChild size="lg" className="w-full">
              <Link
                href={`/api/download/${lightboxImage.slug}` as Route}
                className="flex items-center justify-center gap-2"
              >
                <FileDown className="h-5 w-5" />
                Boyama Sayfasını İndir
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
