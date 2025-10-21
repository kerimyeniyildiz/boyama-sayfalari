type ParentLike =
  | {
      parent?: { slug: string | null } | null;
    }
  | {
      parentSlug?: string | null;
    };

type PageLike = {
  slug: string;
} & ParentLike;

function resolveParentSlug(page: ParentLike): string | null | undefined {
  if ("parentSlug" in page) {
    return page.parentSlug ?? null;
  }

  if ("parent" in page) {
    return page.parent?.slug ?? null;
  }

  return null;
}

export function buildColoringPagePath(page: PageLike): string {
  const parentSlug = resolveParentSlug(page);
  if (parentSlug) {
    return `/${parentSlug}`;
  }
  return `/${page.slug}`;
}

export function buildColoringPageUrl(
  page: PageLike,
  baseUrl: string
): string {
  const path = buildColoringPagePath(page);
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
