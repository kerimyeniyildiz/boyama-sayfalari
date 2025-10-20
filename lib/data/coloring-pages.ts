import { unstable_cache } from "next/cache";
import { PageStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

const ONE_DAY_SECONDS = 60 * 60 * 24;

export type ColoringPageSummary = Prisma.ColoringPageGetPayload<{
  include: {
    categories: { include: { category: true } };
    tags: { include: { tag: true } };
    parent: { select: { slug: true } };
  };
}>;

export type ColoringPageDetail = Prisma.ColoringPageGetPayload<{
  include: {
    categories: { include: { category: true } };
    tags: { include: { tag: true } };
    children: {
      include: {
        categories: { include: { category: true } };
        tags: { include: { tag: true } };
      };
      orderBy: { createdAt: "asc" };
    };
    parent: {
      include: {
        categories: { include: { category: true } };
        tags: { include: { tag: true } };
        children: {
          include: {
            categories: { include: { category: true } };
            tags: { include: { tag: true } };
          };
          orderBy: { createdAt: "asc" };
        };
      };
    };
  };
}>;

export type CategoryWithPageRelations = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  pages: ColoringPageSummary[];
};

export type TagWithPageRelations = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  pages: ColoringPageSummary[];
};

export type DownloadablePage = {
  id: string;
  slug: string;
  title: string;
  pdfKey: string;
  downloads: number;
};

function cacheResult<T>(keyParts: string[], fn: () => Promise<T>) {
  return unstable_cache(fn, keyParts, {
    revalidate: ONE_DAY_SECONDS
  })();
}

export async function getFeaturedPages(
  limit = 6
): Promise<ColoringPageSummary[]> {
  return cacheResult<ColoringPageSummary[]>(
    ["coloring-pages", "featured", String(limit)],
    async () =>
      prisma.coloringPage.findMany({
        where: { status: PageStatus.PUBLISHED, parentId: null },
        orderBy: [{ downloads: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          parent: { select: { slug: true } }
        }
      })
  );
}

export async function getRecentPages(
  limit = 12
): Promise<ColoringPageSummary[]> {
  return cacheResult<ColoringPageSummary[]>(
    ["coloring-pages", "recent", String(limit)],
    async () =>
      prisma.coloringPage.findMany({
        where: { status: PageStatus.PUBLISHED, parentId: null },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          parent: { select: { slug: true } }
        }
      })
  );
}

export async function getColoringPageBySlug(
  slug: string
): Promise<ColoringPageDetail | null> {
  return cacheResult<ColoringPageDetail | null>(
    ["coloring-page", slug],
    async () =>
      prisma.coloringPage.findUnique({
        where: { slug },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          children: {
            include: {
              categories: { include: { category: true } },
              tags: { include: { tag: true } }
            },
            orderBy: { createdAt: "asc" }
          },
          parent: {
            include: {
              categories: { include: { category: true } },
              tags: { include: { tag: true } },
              children: {
                include: {
                  categories: { include: { category: true } },
                  tags: { include: { tag: true } }
                },
                orderBy: { createdAt: "asc" }
              }
            }
          }
        }
      })
  );
}

export async function getColoringPageById(
  id: string
): Promise<ColoringPageDetail | null> {
  return prisma.coloringPage.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      children: {
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      parent: {
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          children: {
            include: {
              categories: { include: { category: true } },
              tags: { include: { tag: true } }
            },
            orderBy: { createdAt: "asc" }
          }
        }
      }
    }
  });
}

export async function getRelatedPages(
  slug: string,
  categorySlugs: string[],
  tagSlugs: string[],
  limit = 6
) {
  const keyParts = [
    "coloring-pages-related",
    slug,
    categorySlugs.sort().join(","),
    tagSlugs.sort().join(","),
    String(limit)
  ];

  return cacheResult(keyParts, async () => {
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
      status: PageStatus.PUBLISHED,
      parentId: null
    };

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    return prisma.coloringPage.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        parent: { select: { slug: true } }
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

export async function getTagsWithCounts(limit = 50) {
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

export async function getCategorySlugs() {
  return prisma.category.findMany({
    select: { slug: true }
  });
}

export async function getTagSlugs() {
  return prisma.tag.findMany({
    select: { slug: true }
  });
}

export async function getColoringPageSlugs() {
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
): Promise<ColoringPageSummary[]> {
  return cacheResult<ColoringPageSummary[]>(
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
          parent: { select: { slug: true } }
        }
      })
  );
}

export async function getPagesByTagSlug(
  slug: string
): Promise<ColoringPageSummary[]> {
  return cacheResult<ColoringPageSummary[]>(
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
          parent: { select: { slug: true } }
        }
      })
  );
}

export async function getCategoryWithPages(slug: string) {
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
                  parent: { select: { slug: true } }
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

  return {
    ...category,
    pages: category.pages.map((relation) => relation.page)
  };
}

export async function getTagWithPages(slug: string) {
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
                  parent: { select: { slug: true } }
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

  return {
    ...tag,
    pages: tag.pages.map((relation) => relation.page)
  };
}

export async function getDownloadablePage(slug: string) {
  return prisma.coloringPage.findUnique({
    where: { slug, status: PageStatus.PUBLISHED },
    select: {
      id: true,
      slug: true,
      title: true,
      pdfKey: true,
      downloads: true
    }
  });
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
