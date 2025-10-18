import { unstable_cache } from "next/cache";
import { PageStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

const ONE_DAY_SECONDS = 60 * 60 * 24;

export type ColoringPageWithRelations = Prisma.ColoringPageGetPayload<{
  include: {
    categories: { include: { category: true } };
    tags: { include: { tag: true } };
    assets: true;
  };
}>;

export type CategoryWithPageRelations = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  pages: ColoringPageWithRelations[];
};

export type TagWithPageRelations = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  pages: ColoringPageWithRelations[];
};

export type DownloadablePage = {
  id: string;
  slug: string;
  title: string;
  pdfKey: string;
  downloads: number;
  assets: Array<{ id: string; pdfKey: string }>;
};

function cacheResult<T>(keyParts: string[], fn: () => Promise<T>) {
  return unstable_cache(fn, keyParts, {
    revalidate: ONE_DAY_SECONDS
  })();
}

export async function getFeaturedPages(
  limit = 6
): Promise<ColoringPageWithRelations[]> {
  return cacheResult<ColoringPageWithRelations[]>(
    ["coloring-pages", "featured", String(limit)],
    async () =>
      prisma.coloringPage.findMany({
        where: { status: PageStatus.PUBLISHED },
        orderBy: [{ downloads: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          assets: {
            orderBy: { position: "asc" }
          }
        }
      })
  );
}

export async function getRecentPages(
  limit = 12
): Promise<ColoringPageWithRelations[]> {
  return cacheResult<ColoringPageWithRelations[]>(
    ["coloring-pages", "recent", String(limit)],
    async () =>
      prisma.coloringPage.findMany({
        where: { status: PageStatus.PUBLISHED },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          assets: {
            orderBy: { position: "asc" }
          }
        }
      })
  );
}

export async function getColoringPageBySlug(
  slug: string
): Promise<ColoringPageWithRelations | null> {
  return cacheResult<ColoringPageWithRelations | null>(
    ["coloring-page", slug],
    async () =>
      prisma.coloringPage.findUnique({
        where: { slug },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          assets: {
            orderBy: { position: "asc" }
          }
        }
      })
  );
}

export async function getColoringPageById(
  id: string
): Promise<ColoringPageWithRelations | null> {
  return cacheResult<ColoringPageWithRelations | null>(
    ["coloring-page-id", id],
    async () =>
      prisma.coloringPage.findUnique({
        where: { id },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          assets: {
            orderBy: { position: "asc" }
          }
        }
      })
  );
}

export async function getRelatedPages(
  slug: string,
  categorySlugs: string[],
  tagSlugs: string[],
  limit = 6
): Promise<ColoringPageWithRelations[]> {
  const keyParts = [
    "coloring-pages-related",
    slug,
    categorySlugs.sort().join(","),
    tagSlugs.sort().join(","),
    String(limit)
  ];

  return cacheResult<ColoringPageWithRelations[]>(keyParts, async () => {
    const orConditions: Prisma.ColoringPageWhereInput[] = [];

    if (categorySlugs.length > 0) {
      orConditions.push({
        categories: {
          some: { category: { slug: { in: categorySlugs } } }
        }
      });
    }

    if (tagSlugs.length > 0) {
      orConditions.push({
        tags: {
          some: { tag: { slug: { in: tagSlugs } } }
        }
      });
    }

    const where: Prisma.ColoringPageWhereInput = {
      slug: { not: slug },
      status: PageStatus.PUBLISHED
    };

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    return prisma.coloringPage.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        assets: {
          orderBy: { position: "asc" }
        }
      },
      take: limit,
      orderBy: [{ downloads: "desc" }, { createdAt: "desc" }]
    });
  });
}

export async function getCategoriesWithCounts() {
  const categories = await cacheResult(
    ["categories-with-counts"],
    async () =>
      prisma.category.findMany({
        include: {
          _count: { select: { pages: true } }
        },
        orderBy: { name: "asc" }
      })
  );

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    count: category._count.pages
  }));
}

export async function getTagsWithCounts(limit = 20) {
  const tags = await cacheResult(
    ["tags-with-counts", String(limit)],
    async () =>
      prisma.tag.findMany({
        include: {
          _count: { select: { pages: true } }
        },
        orderBy: { name: "asc" },
        take: limit
      })
  );

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    count: tag._count.pages
  }));
}

export async function getAllCategorySlugs() {
  const categories = await cacheResult(
    ["category-slugs"],
    async () =>
      prisma.category.findMany({
        select: { slug: true }
      })
  );
  return categories.map((category) => category.slug);
}

export async function getAllTagSlugs() {
  const tags = await cacheResult(
    ["tag-slugs"],
    async () =>
      prisma.tag.findMany({
        select: { slug: true }
      })
  );
  return tags.map((tag) => tag.slug);
}

export async function getAllPublishedSlugs() {
  const pages = await cacheResult(
    ["coloring-page-slugs"],
    async () =>
      prisma.coloringPage.findMany({
        where: { status: PageStatus.PUBLISHED },
        select: { slug: true }
      })
  );
  return pages.map((page) => page.slug);
}

export async function getPagesByCategorySlug(
  slug: string
): Promise<ColoringPageWithRelations[]> {
  return cacheResult<ColoringPageWithRelations[]>(
    ["coloring-pages-category", slug],
    async () =>
      prisma.coloringPage.findMany({
        where: {
          status: PageStatus.PUBLISHED,
          categories: { some: { category: { slug } } }
        },
        orderBy: { createdAt: "desc" },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          assets: {
            orderBy: { position: "asc" }
          }
        }
      })
  );
}

export async function getPagesByTagSlug(
  slug: string
): Promise<ColoringPageWithRelations[]> {
  return cacheResult<ColoringPageWithRelations[]>(
    ["coloring-pages-tag", slug],
    async () =>
      prisma.coloringPage.findMany({
        where: {
          status: PageStatus.PUBLISHED,
          tags: { some: { tag: { slug } } }
        },
        orderBy: { createdAt: "desc" },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          assets: {
            orderBy: { position: "asc" }
          }
        }
      })
  );
}

export async function getCategoryWithPages(
  slug: string
): Promise<CategoryWithPageRelations | null> {
  const category = await cacheResult(
    ["category-with-pages", slug],
    async () =>
      prisma.category.findUnique({
        where: { slug },
        include: {
          pages: {
            include: {
              page: {
                include: {
                  categories: { include: { category: true } },
                  tags: { include: { tag: true } },
                  assets: {
                    orderBy: { position: "asc" }
                  }
                }
              }
            },
            orderBy: { page: { createdAt: "desc" } }
          }
        }
      })
  );

  if (!category) {
    return null;
  }

  const { pages: pageRelations, ...rest } = category;

  return {
    ...(rest as CategoryWithPageRelations),
    pages: pageRelations.map((relation) => relation.page)
  };
}

export async function getTagWithPages(
  slug: string
): Promise<TagWithPageRelations | null> {
  const tag = await cacheResult(
    ["tag-with-pages", slug],
    async () =>
      prisma.tag.findUnique({
        where: { slug },
        include: {
          pages: {
            include: {
              page: {
                include: {
                  categories: { include: { category: true } },
                  tags: { include: { tag: true } },
                  assets: {
                    orderBy: { position: "asc" }
                  }
                }
              }
            },
            orderBy: { page: { createdAt: "desc" } }
          }
        }
      })
  );

  if (!tag) {
    return null;
  }

  const { pages: pageRelations, ...rest } = tag;

  return {
    ...(rest as TagWithPageRelations),
    pages: pageRelations.map((relation) => relation.page)
  };
}

export async function getDownloadablePage(
  slug: string
): Promise<DownloadablePage | null> {
  const result = await prisma.coloringPage.findUnique({
    where: { slug, status: PageStatus.PUBLISHED },
    select: {
      id: true,
      slug: true,
      title: true,
      pdfKey: true,
      downloads: true,
      assets: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          pdfKey: true
        }
      }
    }
  });

  return result as DownloadablePage | null;
}

export async function incrementDownloads(pageId: string) {
  return prisma.coloringPage.update({
    where: { id: pageId },
    data: {
      downloads: { increment: 1 }
    },
    select: { downloads: true }
  });
}
