"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Palette, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeaderLink = {
  href: Route;
  label: string;
};

const links: HeaderLink[] = [
  { href: "/" as Route, label: "Ana Sayfa" },
  { href: "/kategori/hayvanlar" as Route, label: "Kategori" },
  { href: "/ara" as Route, label: "Ara" }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-brand-dark/10 bg-white/90 backdrop-blur">
      <div className="container flex h-20 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-semibold text-brand-dark transition transform hover:scale-[1.02]"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand">
            <Palette className="h-6 w-6 text-brand-dark" />
          </span>
          <span className="font-heading">
            {process.env.NEXT_PUBLIC_SITE_NAME ?? "Boyama Sayfaları"}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  isActive
                    ? "text-brand-dark"
                    : "text-brand-dark/60 hover:text-brand-dark"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Boyama sayfası ara">
            <Link href="/ara">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild className="hidden md:inline-flex">
            <Link href="/ara?q=boyama">Ücretsiz İndir</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
