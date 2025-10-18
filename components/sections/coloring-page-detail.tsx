import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type {
  ColoringPage,
  ColoringPageAsset,
  ColoringPageCategory,
  ColoringPageTag
} from "@prisma/client";
import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ColoringPageCard } from "@/components/cards/coloring-page-card";
import { FALLBACK_BLUR_DATA_URL } from "@/lib/placeholders";
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
  assets: Array<
    ColoringPageAsset & {
      width: number | null;
      height: number | null;
      fileSizeBytes: number | null;
      position: number;
    }
  >;
};

type Props = {
  page: ColoringPageWithRelations;
  related: ColoringPageWithRelations[];
};

type DisplayAsset = {
  id: string;
  pdfKey: string;
  coverImageKey: string | null;
  thumbLargeKey: string | null;
  thumbSmallKey: string | null;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
};

function getAssetImageUrl(asset: DisplayAsset) {
  if (asset.thumbLargeKey) {
    return getPublicUrl(asset.thumbLargeKey);
  }
  if (asset.coverImageKey) {
    return getPublicUrl(asset.coverImageKey);
  }
  return FALLBACK_BLUR_DATA_URL;
}

function getAssetBlurUrl(asset: DisplayAsset) {
  if (asset.thumbSmallKey) {
    return getPublicUrl(asset.thumbSmallKey);
  }
  return FALLBACK_BLUR_DATA_URL;
}

export function ColoringPageDetail({ page, related }: Props) {
  const primaryThumbSmall = page.thumbWebpKey.includes("-800.")
    ? page.thumbWebpKey.replace("-800.", "-400.")
    : page.thumbWebpKey;

  const primaryAsset: DisplayAsset = {
    id: "primary",
    pdfKey: page.pdfKey,
    coverImageKey: page.coverImageKey,
    thumbLargeKey: page.thumbWebpKey,
    thumbSmallKey: primaryThumbSmall,
    width: page.width ?? undefined,
    height: page.height ?? undefined,
    fileSizeBytes: page.fileSizeBytes ?? undefined
  };

  const extraAssets: DisplayAsset[] = page.assets
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((asset) => ({
      id: asset.id,
      pdfKey: asset.pdfKey,
      coverImageKey: asset.coverImageKey,
      thumbLargeKey: asset.thumbLargeKey,
      thumbSmallKey: asset.thumbSmallKey,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      fileSizeBytes: asset.fileSizeBytes ?? undefined
    }));

  const assets: DisplayAsset[] = [primaryAsset, ...extraAssets];
  const primary = assets[0];
  const others = assets.slice(1);

  const primaryImageLarge = getAssetImageUrl(primary);
  const primaryBlur = getAssetBlurUrl(primary);
  const hasPrimaryThumb = Boolean(primary.thumbLargeKey ?? primary.coverImageKey);
  const pdfRoute = `/api/download/${page.slug}` as Route;

  return (
    <section className="container py-12">
      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-card">
          <Image
            src={primaryImageLarge}
            alt={page.title}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-contain"
            placeholder="blur"
            blurDataURL={primaryBlur}
            unoptimized={!hasPrimaryThumb}
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
                  {primary.width ?? "?"}x{primary.height ?? "?"} px  {Math.round((primary.fileSizeBytes ?? 0) / 1024)} KB
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
              <Link href={pdfRoute}>
                <FileDown className="mr-2 h-5 w-5" />
                PDF indir
              </Link>
            </Button>
            <p className="text-xs text-brand-dark/60">
              ndirme linkleri Cloudflare R2 ile gvenli ekilde ynlendirilir.
            </p>
            {others.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-brand-dark">
                  Dier PDF seenekleri
                </p>
                <div className="grid gap-2">
                  {others.map((asset, index) => (
                    <Button asChild variant="outline" key={asset.id}>
                      <Link href={`/api/download/${page.slug}?asset=${asset.id}`}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {`PDF indir #${index + 2}`}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {others.length > 0 ? (
        <div className="mt-16 space-y-6">
          <h2 className="text-2xl font-semibold text-brand-dark">
            Ek boyama grselleri
          </h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {others.map((asset) => {
              const imageUrl = getAssetImageUrl(asset);
              const blurUrl = getAssetBlurUrl(asset);

              return (
                <div
                  key={asset.id}
                  className="flex flex-col gap-3 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-card"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-brand-light">
                    <Image
                      src={imageUrl}
                      alt={`${page.title} grseli`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain"
                      placeholder="blur"
                      blurDataURL={blurUrl}
                      unoptimized={!asset.thumbLargeKey && !asset.coverImageKey}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {related.length > 0 ? (
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-brand-dark">
            Benzer boyama sayfalar
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