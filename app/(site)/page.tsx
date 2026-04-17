import { buildCollectionJsonLd, buildMetadata, buildWebSiteJsonLd, siteConfig } from "@/lib/seo";
import {
  getCategoriesWithCounts,
  getFeaturedPages,
  getRecentPages,
  getTagsWithCounts
} from "@/lib/data/coloring-pages";
import { getPublicUrl } from "@/lib/r2";
import { buildColoringPageUrl } from "@/lib/page-paths";
import { JsonLd } from "@/components/seo/json-ld";
import { HeroSection } from "@/components/sections/hero-section";
import { FeaturedGrid } from "@/components/sections/featured-grid";
import { CategorySection } from "@/components/sections/category-section";
import { LatestSection } from "@/components/sections/latest-section";
import { TagCloud } from "@/components/sections/tag-cloud";

// Anasayfa build-time prerender'a girmez; Dokploy Nixpacks build
// container'ı DB'ye ulaşamadığı için prerender edilirse boş veriyle
// cache'lenip saatlerce yanlış sürüm servis edilebiliyor. Runtime'da
// ilk istekte taze veri ile SSR edilir; `lib/data/coloring-pages`
// katmanındaki `unstable_cache` zaten 7 gün veri cache tutuyor,
// dolayısıyla SSR maliyeti düşük. Cloudflare önünde
// `next.config.mjs` başlıkları ile edge cache devreye giriyor.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({
    title: "Boyama Sayfaları | 10000+ Ücretsiz PDF İndir ve Yazdır",
    description:
      "Çocuklar için ücretsiz boyama sayfalarını indirin. Hayvanlar, araçlar, prensesler ve daha birçok kategoride yazdırılabilir boyama sayfaları.",
    path: "/"
  });
}

export default async function HomePage() {
  const [featured, recent, categories, tags] = await Promise.all([
    getFeaturedPages(6),
    getRecentPages(12),
    getCategoriesWithCounts(),
    getTagsWithCounts(30)
  ]);

  const collectionJsonLd = buildCollectionJsonLd({
    name: "Popüler Boyama Koleksiyonları",
    description:
      "En çok indirilen ve beğenilen boyama sayfaları koleksiyonu.",
    url: siteConfig.url,
    items: featured.map((page) => ({
      name: page.title,
      url: buildColoringPageUrl(page, siteConfig.url),
      image: getPublicUrl(page.thumbWebpKey),
      description: page.description
    }))
  });

  return (
    <>
      <HeroSection categories={categories} />
      <FeaturedGrid pages={featured} />
      <CategorySection categories={categories} />
      <LatestSection pages={recent} />
      <TagCloud tags={tags} />

      <JsonLd data={buildWebSiteJsonLd()} />
      <JsonLd data={collectionJsonLd} />
    </>
  );
}
