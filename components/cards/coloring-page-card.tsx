import Image from "next/image";
import Link from "next/link";
import type {
  ColoringPage,
  ColoringPageCategory,
  ColoringPageTag
} from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FALLBACK_BLUR_DATA_URL } from "@/lib/placeholders";
import { getPublicUrl } from "@/lib/r2";
import { cn } from "@/lib/utils";

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

type ColoringPageCardProps = {
  page: ColoringPageWithRelations;
  priority?: boolean;
  className?: string;
};

export function ColoringPageCard({
  page,
  priority,
  className
}: ColoringPageCardProps) {
  const hasThumbKey = Boolean(page.thumbWebpKey);
  const thumbLargeUrl = hasThumbKey
    ? getPublicUrl(page.thumbWebpKey)
    : FALLBACK_BLUR_DATA_URL;
  const blurDataURL =
    hasThumbKey && page.thumbWebpKey.includes("-400.")
      ? getPublicUrl(page.thumbWebpKey)
      : FALLBACK_BLUR_DATA_URL;

  return (
    <Card className={cn("h-full overflow-hidden", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-light">
        <Link href={`/sayfa/${page.slug}`}>
          <Image
            src={thumbLargeUrl}
            alt={page.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 hover:scale-105"
            priority={priority}
            placeholder="blur"
            blurDataURL={blurDataURL}
            unoptimized={!hasThumbKey}
          />
        </Link>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <Badge variant="default">{page.downloads} indirme</Badge>
        </div>
      </div>
      <CardContent className="pt-6">
        <Link
          href={`/sayfa/${page.slug}`}
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
