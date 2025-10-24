import Link from "next/link";

export function SiteFooter() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Boyama Sayfaları";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-brand-dark/10 bg-white/80">
      <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-brand-dark">{siteName}</p>
          <p className="max-w-lg text-sm text-brand-dark/70">
            Çocukların yaratıcılığını destekleyen özenli boyama sayfaları. PDF
            olarak indir, yazdır ve renklendir.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-brand-dark/70">
          <Link href="/gizlilik-politikasi" className="hover:text-brand-dark">
            Gizlilik Politikası
          </Link>
          <Link href="/kullanim-sartlari" className="hover:text-brand-dark">
            Kullanım Şartları
          </Link>
          <Link href="/iletisim" className="hover:text-brand-dark">
            İletişim
          </Link>
        </div>
      </div>
      <div className="border-t border-brand-dark/10 py-4">
        <div className="container flex flex-col gap-2 text-xs text-brand-dark/60 sm:flex-row sm:items-center sm:justify-between">
          <span>© {currentYear} {siteName}</span>
          <span>Kodlama: Kerim Yeniyıldız</span>
        </div>
      </div>
    </footer>
  );
}
