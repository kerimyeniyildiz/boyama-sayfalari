export const CACHE_TAGS = {
  coloringPages: "coloring-pages",
  featured: "coloring-pages:featured",
  recent: "coloring-pages:recent",
  slugs: "coloring-pages:slugs",
  categories: "categories",
  tags: "tags",
  sitemaps: "sitemaps"
} as const;

export function tagForColoringPage(slug: string) {
  return `coloring-page:${slug}`;
}

export function tagForCategory(slug: string) {
  return `category:${slug}`;
}

export function tagForTag(slug: string) {
  return `tag:${slug}`;
}
