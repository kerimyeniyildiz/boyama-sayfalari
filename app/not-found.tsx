import Link from "next/link";
import type { Metadata } from "next";
import { Home, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buildMetadata, siteConfig } from "@/lib/seo";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    ...buildMetadata({
      title: "Sayfa bulunamadı (404)",
      description:
        "Aradığın boyama sayfası bulunamadı. Anasayfadan gezmeye ya da arama yapmaya devam edebilirsin.",
      path: "/404"
    }),
    robots: {
      index: false,
      follow: true
    }
  };
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center">
        <section className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-dark/60">
              404
            </p>
            <h1 className="mt-3 text-3xl font-bold text-brand-dark sm:text-4xl">
              Bu boyama sayfası kayboldu gibi görünüyor
            </h1>
            <p className="mt-4 text-brand-dark/70">
              Aradığın sayfa taşınmış, silinmiş veya adres yanlış yazılmış
              olabilir. Yine de {siteConfig.name}&apos;de boyayacak binlerce
              sayfa var &mdash; anasayfadan göz atabilir veya arama yaparak
              istediğin boyamayı bulabilirsin.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Anasayfaya dön
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/ara" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Boyama sayfası ara
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
