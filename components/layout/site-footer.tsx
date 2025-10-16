import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-dark/10 bg-white/80">
      <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-brand-dark">
            {process.env.NEXT_PUBLIC_SITE_NAME ?? "Boyama Sayfaları"}
          </p>
          <p className="max-w-lg text-sm text-brand-dark/70">
            Çocukların yaratıcılığını destekleyen özenli boyama sayfaları. PDF
            olarak indir, yazdır ve renklendir.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-brand-dark/70">
          <Link href="/ara" className="hover:text-brand-dark">
            Arama
          </Link>
          <Link href="/kategori/hayvanlar" className="hover:text-brand-dark">
            Kategoriler
          </Link>
          <Link href="/admin/login" className="hover:text-brand-dark">
            Yönetici
          </Link>
        </div>
      </div>
      <div className="border-t border-brand-dark/10 py-4">
        <div className="container flex flex-col gap-2 text-xs text-brand-dark/60 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()}{" "}
            {process.env.NEXT_PUBLIC_SITE_NAME ?? "Boyama Sayfaları"}
          </span>
          <span>
            Tasarım: Figma → Next.js dönüşümü. Performans ve SEO için optimize.
          </span>
        </div>
      </div>
    </footer>
  );
}
