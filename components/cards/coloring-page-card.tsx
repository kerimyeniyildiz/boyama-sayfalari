import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FALLBACK_BLUR_DATA_URL } from "@/lib/placeholders";
import { getPublicUrl } from "@/lib/r2";
import { cn } from "@/lib/utils";
import type { ColoringPageSummary } from "@/lib/data/coloring-pages";

type ColoringPageCardProps = {
  page: ColoringPageSummary;
  priority?: boolean;
  className?: string;
};

function getThumbUrls(page: ColoringPageSummary) {
  if (page.thumbWebpKey) {
    const large = getPublicUrl(page.thumbWebpKey);
    const small = page.thumbWebpKey.includes("-800.")
      ? getPublicUrl(page.thumbWebpKey.replace("-800.", "-400."))
      : null;
    return { large, small };
  }

  if (page.coverImageKey) {
    const url = getPublicUrl(page.coverImageKey);
    return { large: url, small: url };
  }

  return {
    large: FALLBACK_BLUR_DATA_URL,
    small: FALLBACK_BLUR_DATA_URL
  };
}

export function ColoringPageCard({
  page,
  priority,
  className
}: ColoringPageCardProps) {
  const { large, small } = getThumbUrls(page);
  const hasOptimized = large !== FALLBACK_BLUR_DATA_URL;

  return (
    <Card className={cn("h-full overflow-hidden", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-light">
        <Link href={`/${page.slug}`}>
          <Image
            src={large}
            alt={page.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain object-center transition-transform duration-500 hover:scale-105"
            priority={priority}
            placeholder="blur"
            blurDataURL={small ?? FALLBACK_BLUR_DATA_URL}
            unoptimized={!hasOptimized}
          />
        </Link>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <Badge variant="default">{page.downloads} indirme</Badge>
        </div>
      </div>
      <CardContent className="pt-6">
        <Link
          href={`/${page.slug}`}
          className="text-lg font-semibold text-brand-dark"
        >
          {page.title}
        </Link>
        <p className="mt-2 line-clamp-2 text-sm text-brand-dark/70">
          {page.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-brand-dark/60">
          {page.categories.slice(0, 2).map((category) => (
            <Link
              key={category.category.id}
              href={`/kategori/${category.category.slug}`}
              className="rounded-full border border-brand-dark/10 px-3 py-1 hover:border-brand-dark/40"
            >
              {category.category.name}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
