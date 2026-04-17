import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, siteConfig } from "@/lib/seo";
import { cn } from "@/lib/utils";

export type BreadcrumbEntry = {
  name: string;
  /**
   * Son öğe (geçerli sayfa) için `href` boş bırakılabilir;
   * o durumda metin link yerine statik bir öğe olarak gösterilir.
   */
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbEntry[];
  className?: string;
};

function toAbsoluteUrl(href: string | undefined) {
  if (!href) {
    return siteConfig.url;
  }
  try {
    return new URL(href, siteConfig.url).toString();
  } catch {
    return siteConfig.url;
  }
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const fullTrail: BreadcrumbEntry[] = [
    { name: "Anasayfa", href: "/" },
    ...items
  ];

  const jsonLd = buildBreadcrumbJsonLd(
    fullTrail.map((entry) => ({
      name: entry.name,
      url: toAbsoluteUrl(entry.href)
    }))
  );

  return (
    <nav
      aria-label="Ekmek kırıntısı"
      className={cn(
        "container pt-6 text-sm text-brand-dark/70",
        className
      )}
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {fullTrail.map((entry, index) => {
          const isLast = index === fullTrail.length - 1;
          return (
            <li key={`${entry.name}-${index}`} className="flex items-center gap-2">
              {index > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-brand-dark/40"
                />
              ) : null}
              {entry.href && !isLast ? (
                <Link
                  href={entry.href as Route}
                  className="hover:text-brand-dark hover:underline"
                >
                  {entry.name}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(isLast && "font-medium text-brand-dark")}
                >
                  {entry.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <JsonLd data={jsonLd} />
    </nav>
  );
}
