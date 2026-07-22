import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import * as cheerio from "cheerio";

const LIVE_ORIGIN = "https://boyamasayfasi.com.tr";
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), ".migration");

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

type PageRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  seoContent: string | null;
  orientation: "PORTRAIT" | "LANDSCAPE";
  ageMin: number | null;
  ageMax: number | null;
  artist: string | null;
  license: string | null;
  sourceUrl: string | null;
  status: "PUBLISHED";
  publishAt: string | null;
  language: "tr";
  pdfKey: string;
  coverImageKey: string;
  thumbWebpKey: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  views: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  categoryIds: string[];
};

type Snapshot = {
  version: 1;
  source: string;
  exportedAt: string;
  categories: CategoryRecord[];
  pages: PageRecord[];
};

function stableId(prefix: string, value: string) {
  const digest = createHash("sha256").update(`${prefix}:${value}`).digest("hex");
  return `${prefix}_${digest.slice(0, 24)}`;
}

function keyFromPublicUrl(value: string) {
  return decodeURIComponent(new URL(value).pathname.replace(/^\//, ""));
}

function sqlValue(value: string | number | null) {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "BoyamaSayfasi-Cloudflare-Migration/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`${url} ${response.status} döndürdü.`);
  }
  return response.text();
}

function sitemapUrls(xml: string) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) =>
    match[1].replaceAll("&amp;", "&")
  );
}

async function resolvePdfKey(slug: string, coverImageKey: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(`${LIVE_ORIGIN}/api/download/${slug}`, {
      redirect: "manual",
      headers: {
        "user-agent": "BoyamaSayfasi-Cloudflare-Migration/1.0"
      }
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      return keyFromPublicUrl(location);
    }
    if (attempt === 3) break;
  }

  const inferredKey = coverImageKey
    .replace(/^cover\//, "pdf/")
    .replace(/\.webp$/, ".pdf");
  const publicCheck = await fetch(`https://cdn.boyamasayfasi.com.tr/${inferredKey}`, {
    method: "HEAD"
  });
  if (!publicCheck.ok) {
    throw new Error(
      `${slug} için PDF anahtarı alınamadı ve tahmin edilen nesne bulunamadı (${publicCheck.status}).`
    );
  }
  process.stdout.write(
    `${slug}: canlı indirme rotası 404; mevcut R2 PDF nesnesi kullanıldı.\n`
  );
  return inferredKey;
}

async function mapConcurrent<T, U>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<U>
) {
  const results = new Array<U>(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );
  return results;
}

function getMeta($: cheerio.CheerioAPI, selector: string) {
  return $(selector).first().attr("content")?.trim() ?? "";
}

function childCards(html: string) {
  const decoded = html.replace(/\\"/g, '"');
  const pattern =
    /"slug":"([^"]+)","title":"([^"]+)","imageSrc":"([^"]+)","imageBlur":"([^"]+)","lightboxSrc":"([^"]+)"/g;
  const cards = Array.from(decoded.matchAll(pattern), (match) => ({
    slug: match[1],
    title: match[2],
    thumbUrl: match[3],
    coverUrl: match[5]
  }));

  return Array.from(new Map(cards.map((card) => [card.slug, card])).values());
}

function collectionAnchor(title: string) {
  const match = title.match(/^(.*?)\s+Boyama Sayfaları(?:\s*\|.*)?$/i);
  return match?.[1]?.trim() || title.trim();
}

function buildSql(snapshot: Snapshot) {
  const statements: string[] = [
    "-- Public siteden Cloudflare D1 için oluşturulan içerik aktarımı.",
    "PRAGMA foreign_keys = ON;"
  ];

  for (const category of snapshot.categories) {
    statements.push(
      `INSERT OR REPLACE INTO "Category" ("id","name","slug","createdAt","updatedAt") VALUES (${[
        category.id,
        category.name,
        category.slug,
        category.createdAt,
        category.updatedAt
      ]
        .map(sqlValue)
        .join(",")});`
    );
  }

  const orderedPages = [
    ...snapshot.pages.filter((page) => page.parentId === null),
    ...snapshot.pages.filter((page) => page.parentId !== null)
  ];

  for (const page of orderedPages) {
    const values = [
      page.id,
      page.slug,
      page.title,
      page.description,
      page.seoContent,
      page.orientation,
      page.ageMin,
      page.ageMax,
      page.artist,
      page.license,
      page.sourceUrl,
      page.status,
      page.publishAt,
      page.language,
      page.pdfKey,
      page.coverImageKey,
      page.thumbWebpKey,
      page.width,
      page.height,
      page.fileSizeBytes,
      page.views,
      page.downloads,
      page.createdAt,
      page.updatedAt,
      page.parentId
    ].map(sqlValue);

    statements.push(
      `INSERT OR REPLACE INTO "ColoringPage" ("id","slug","title","description","seoContent","orientation","ageMin","ageMax","artist","license","sourceUrl","status","publishAt","language","pdfKey","coverImageKey","thumbWebpKey","width","height","fileSizeBytes","views","downloads","createdAt","updatedAt","parentId") VALUES (${values.join(",")});`
    );
  }

  for (const page of snapshot.pages) {
    for (const categoryId of page.categoryIds) {
      statements.push(
        `INSERT OR REPLACE INTO "ColoringPageCategory" ("pageId","categoryId") VALUES (${sqlValue(page.id)},${sqlValue(categoryId)});`
      );
    }
  }

  return `${statements.join("\n")}\n`;
}

async function main() {
  const outputDir = path.resolve(process.argv[2] ?? DEFAULT_OUTPUT_DIR);
  await mkdir(outputDir, { recursive: true });

  const [pageSitemap, categorySitemap] = await Promise.all([
    fetchText(`${LIVE_ORIGIN}/sitemaps/pages.xml`),
    fetchText(`${LIVE_ORIGIN}/sitemaps/categories.xml`)
  ]);
  const pageUrls = sitemapUrls(pageSitemap);
  const categoryUrls = sitemapUrls(categorySitemap);
  const now = new Date().toISOString();

  const categories = await mapConcurrent(categoryUrls, 4, async (url) => {
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
    const name = $("h1").first().text().replace(/\s+boyama sayfaları$/i, "").trim();
    const modified = getMeta($, 'meta[property="article:modified_time"]') || now;
    return {
      id: stableId("cat", slug),
      name: name || slug,
      slug,
      createdAt: modified,
      updatedAt: modified
    } satisfies CategoryRecord;
  });
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));

  const pageGroups = await mapConcurrent(pageUrls, 3, async (url) => {
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
    const title = $("title").first().text().trim();
    const description = getMeta($, 'meta[name="description"]');
    const publishedAt =
      getMeta($, 'meta[property="article:published_time"]') || now;
    const updatedAt =
      getMeta($, 'meta[property="article:modified_time"]') || publishedAt;
    const imageUrl = getMeta($, 'meta[property="og:image"]');
    const width = Number.parseInt(getMeta($, 'meta[property="og:image:width"]'), 10);
    const height = Number.parseInt(getMeta($, 'meta[property="og:image:height"]'), 10);
    const parentId = stableId("page", slug);
    const categoryIds = Array.from(
      new Set(
        $("a[href^='/kategori/']")
          .toArray()
          .map((element) => $(element).attr("href")?.split("/").filter(Boolean).at(-1))
          .filter((value): value is string => Boolean(value && categoriesBySlug.has(value)))
          .map((categorySlug) => categoriesBySlug.get(categorySlug)!.id)
      )
    );
    const seoElement = $("[class]")
      .toArray()
      .find((element) => ($(element).attr("class") ?? "").includes("[&_p]"));
    const seoContent = seoElement ? ($(seoElement).html()?.trim() ?? null) : null;
    const parentThumbKey = keyFromPublicUrl(imageUrl);
    const parentCoverKey = parentThumbKey
      .replace(/^thumb\//, "cover/")
      .replace(/-800\.webp$/, ".webp");

    const parent: PageRecord = {
      id: parentId,
      slug,
      title,
      description,
      seoContent,
      orientation:
        Number.isFinite(width) && Number.isFinite(height) && width > height
          ? "LANDSCAPE"
          : "PORTRAIT",
      ageMin: null,
      ageMax: null,
      artist: null,
      license: null,
      sourceUrl: null,
      status: "PUBLISHED",
      publishAt: publishedAt,
      language: "tr",
      pdfKey: await resolvePdfKey(slug, parentCoverKey),
      coverImageKey: parentCoverKey,
      thumbWebpKey: parentThumbKey,
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
      fileSizeBytes: null,
      views: 0,
      downloads: 0,
      createdAt: publishedAt,
      updatedAt,
      parentId: null,
      categoryIds
    };

    const cards = childCards(html);
    const totalPdfCount = cards.length + 1;
    const anchor = collectionAnchor(title);
    parent.title = `${anchor} Boyama Sayfaları | ${totalPdfCount} Ücretsiz PDF`;
    parent.description = `${anchor} boyama sayfaları arasından ${totalPdfCount} ücretsiz PDF seçeneğini keşfedin; beğendiğiniz çizimi indirin, A4 kâğıda yazdırın ve boyayın.`;
    const children = await mapConcurrent(cards, 8, async (card) => ({
      id: stableId("page", card.slug),
      slug: card.slug,
      title: card.title,
      description: `${card.title} görselini ücretsiz PDF olarak indirip A4 boyutunda yazdırabilirsiniz.`,
      seoContent: null,
      orientation: "PORTRAIT" as const,
      ageMin: null,
      ageMax: null,
      artist: null,
      license: null,
      sourceUrl: null,
      status: "PUBLISHED" as const,
      publishAt: publishedAt,
      language: "tr" as const,
      pdfKey: await resolvePdfKey(card.slug, keyFromPublicUrl(card.coverUrl)),
      coverImageKey: keyFromPublicUrl(card.coverUrl),
      thumbWebpKey: keyFromPublicUrl(card.thumbUrl),
      width: null,
      height: null,
      fileSizeBytes: null,
      views: 0,
      downloads: 0,
      createdAt: publishedAt,
      updatedAt,
      parentId,
      categoryIds
    } satisfies PageRecord));

    process.stdout.write(`${slug}: 1 ana + ${children.length} alt içerik\n`);
    return [parent, ...children];
  });

  const pages = pageGroups.flat();
  const duplicateSlugs = pages
    .map((page) => page.slug)
    .filter((slug, index, all) => all.indexOf(slug) !== index);
  if (duplicateSlugs.length > 0) {
    throw new Error(`Yinelenen slug bulundu: ${Array.from(new Set(duplicateSlugs)).join(", ")}`);
  }

  const snapshot: Snapshot = {
    version: 1,
    source: LIVE_ORIGIN,
    exportedAt: now,
    categories,
    pages
  };
  const snapshotPath = path.join(outputDir, "live-content-snapshot.json");
  const sqlPath = path.join(outputDir, "import-live-content.sql");
  await Promise.all([
    writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8"),
    writeFile(sqlPath, buildSql(snapshot), "utf8")
  ]);

  process.stdout.write(
    `Tamamlandı: ${categories.length} kategori, ${pages.filter((page) => page.parentId === null).length} ana içerik, ${pages.filter((page) => page.parentId !== null).length} alt içerik.\n${snapshotPath}\n${sqlPath}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
