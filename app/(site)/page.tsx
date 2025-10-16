import { buildCollectionJsonLd, buildMetadata, buildWebSiteJsonLd, siteConfig } from "@/lib/seo";
import {
  getCategoriesWithCounts,
  getFeaturedPages,
  getRecentPages,
  getTagsWithCounts
} from "@/lib/data/coloring-pages";
import { getPublicUrl } from "@/lib/r2";
import { JsonLd } from "@/components/seo/json-ld";
import { HeroSection } from "@/components/sections/hero-section";
import { FeaturedGrid } from "@/components/sections/featured-grid";
import { CategorySection } from "@/components/sections/category-section";
import { LatestSection } from "@/components/sections/latest-section";
import { TagCloud } from "@/components/sections/tag-cloud";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({
    title: siteConfig.name,
    description: siteConfig.description,
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
      url: `${siteConfig.url}/sayfa/${page.slug}`,
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
