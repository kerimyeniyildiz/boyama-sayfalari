import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ColoringPageDetail } from "@/lib/data/coloring-pages";
import { FALLBACK_BLUR_DATA_URL } from "@/lib/placeholders";
import { buildColoringPagePath } from "@/lib/page-paths";
import { getPublicUrl } from "@/lib/r2";
import { ColoringPageCard } from "./coloring-page-detail-client";

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

const CARDS_PER_SEO_SECTION = 3;

type SplitSeoContentResult = {
  intro: string;
  sections: string[];
};

function splitSeoContentByH2(markup: string): SplitSeoContentResult {
  if (!markup) {
    return { intro: "", sections: [] };
  }

  const headings: Array<{ start: number; end: number }> = [];
  const headingRegex = /<h2\b[^>]*>.*?<\/h2>/gis;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markup)) !== null) {
    headings.push({ start: match.index, end: headingRegex.lastIndex });
  }

  if (headings.length === 0) {
    return { intro: markup, sections: [] };
  }

  const intro = markup.slice(0, headings[0].start).trim();
  const sections = headings.map((heading, index) => {
    const nextStart = headings[index + 1]?.start ?? markup.length;
    return markup.slice(heading.start, nextStart).trim();
  });

  return { intro, sections };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

const seoContentClassName =
  "space-y-3 text-brand-dark/75 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-brand-dark [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-brand-dark [&_p]:leading-relaxed [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5";

const seoIntroClassName =
  "space-y-3 text-brand-dark/70 [&_p]:leading-relaxed [&_strong]:font-semibold [&_em]:italic";

export function ColoringPageDetail({ page }: { page: ColoringPageDetail }) {
  const primaryEntry = toPageEntry(page);
  const { large, blur, optimized } = resolveImageKeys(primaryEntry);
  const pdfRoute = `/api/download/${page.slug}` as Route;
  const extraEntries = buildExtraEntries(page);
  const isChild = Boolean(page.parent);
  const isMainPage = !isChild;
  const seoContentMarkup = page.seoContent?.trim() ?? "";
  const hasSeoContent = isMainPage && seoContentMarkup.length > 0;
  const { intro: seoIntroHtml, sections: seoSections } = hasSeoContent
    ? splitSeoContentByH2(seoContentMarkup)
    : { intro: "", sections: [] };

  const filteredExtraEntries = isChild
    ? extraEntries.filter((entry) => entry.id !== page.id)
    : extraEntries;

  const cardGroups = chunkArray(filteredExtraEntries, CARDS_PER_SEO_SECTION);
  const remainingSeoSections = hasSeoContent
    ? seoSections.slice(cardGroups.length)
    : [];
  const shouldRenderExtraContent =
    filteredExtraEntries.length > 0 || (hasSeoContent && seoSections.length > 0);

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
              {hasSeoContent && seoIntroHtml.length > 0 ? (
                <div
                  className={seoIntroClassName}
                  dangerouslySetInnerHTML={{ __html: seoIntroHtml }}
                />
              ) : null}
              <div className="space-y-3 bg-white/70 text-sm leading-relaxed">
                <p>
                  Hayal gücünü serbest bırak! Ücretsiz, yüksek çözünürlüklü boyama
                  sayfalarımızı indir, yazdır ve dilediğin renklerle canlandır.
                </p>
                <div className="space-y-1">
                  <p className="font-semibold text-brand-dark">Nasıl indirilir?</p>
                  <div className="space-y-1">
                    <p>PDF indir düğmesine tıkla.</p>
                    <p>Açılan dosyada indir / kaydet seçeneğini işaretle.</p>
                    <p>A4 yazdır veya tablette dijital olarak boya.</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-brand-dark">İpucu</p>
                  <div className="space-y-1">
                    <p>
                      Büyük alanlar için keçeli kalem, detaylar için ince uçlu kalem kullan.
                    </p>
                    <p>Bitirdiğinde adını ve tarihi eklemeyi unutma.</p>
                  </div>
                </div>
              </div>
            </div>
            <dl className="grid gap-2 text-sm text-brand-dark/70">
              <div className="flex gap-2">
                <dt className="min-w-[120px] font-medium text-brand-dark">Boyut</dt>
                <dd>
                  {primaryEntry.width ?? "?"} × {primaryEntry.height ?? "?"} px · {Math.round((page.fileSizeBytes ?? 0) / 1024)} KB
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
              <Link href={pdfRoute} className="flex items-center justify-center gap-2">
                <FileDown className="h-5 w-5" />
                PDF indir
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {shouldRenderExtraContent ? (
        <div className="mt-16 space-y-8">
          {filteredExtraEntries.length > 0 ? (
            <p className="text-2xl font-semibold text-brand-dark">
              Boyama sayfalarını keşfet:
            </p>
          ) : null}
          <div className="space-y-10">
            {cardGroups.map((group, groupIndex) => {
              const sectionHtml = hasSeoContent ? seoSections[groupIndex] : undefined;

              if (group.length === 0 && !sectionHtml) {
                return null;
              }

              return (
                <div key={`card-group-${groupIndex}`} className="space-y-6">
                  {group.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {group.map((entry) => {
                        const {
                          large: entryImage,
                          blur: entryBlur,
                          optimized: entryOptimized
                        } = resolveImageKeys(entry);

                        return (
                          <ColoringPageCard
                            key={entry.id}
                            id={entry.id}
                            slug={entry.slug}
                            title={entry.title}
                            imageSrc={entryImage}
                            imageBlur={entryBlur}
                            optimized={entryOptimized}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                  {sectionHtml ? (
                    <div
                      className={seoContentClassName}
                      dangerouslySetInnerHTML={{ __html: sectionHtml }}
                    />
                  ) : null}
                </div>
              );
            })}
            {hasSeoContent
              ? remainingSeoSections.map((sectionHtml, index) => (
                  <div
                    key={`seo-section-tail-${index}`}
                    className={seoContentClassName}
                    dangerouslySetInnerHTML={{ __html: sectionHtml }}
                  />
                ))
              : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
