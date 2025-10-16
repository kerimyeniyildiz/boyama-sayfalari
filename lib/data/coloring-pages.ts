import {
  Difficulty,
  Orientation,
  PageStatus,
  Prisma
} from "@prisma/client";

import { prisma } from "@/lib/db";

export async function getFeaturedPages(limit = 6) {
  return prisma.coloringPage.findMany({
    where: { status: PageStatus.PUBLISHED },
    orderBy: [
      { downloads: "desc" },
      { createdAt: "desc" }
    ],
    take: limit,
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } }
    }
  });
}

export async function getRecentPages(limit = 12) {
  return prisma.coloringPage.findMany({
    where: { status: PageStatus.PUBLISHED },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } }
    }
  });
}

export async function getColoringPageBySlug(slug: string) {
  return prisma.coloringPage.findUnique({
    where: { slug },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } }
    }
  });
}

export async function getColoringPageById(id: string) {
  return prisma.coloringPage.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } }
    }
  });
}

export async function getRelatedPages(
  slug: string,
  difficulty: Difficulty,
  orientation: Orientation,
  limit = 6
) {
  return prisma.coloringPage.findMany({
    where: {
      slug: { not: slug },
      status: PageStatus.PUBLISHED,
      OR: [
        { difficulty },
        { orientation }
      ]
    },
    include: {
      categories: { include: { category: true } }
    },
    take: limit,
    orderBy: [
      { downloads: "desc" },
      { createdAt: "desc" }
    ]
  });
}

export async function getCategoriesWithCounts() {
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { pages: true } }
    },
    orderBy: { name: "asc" }
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    count: category._count.pages
  }));
}

export async function getTagsWithCounts(limit = 20) {
  const tags = await prisma.tag.findMany({
    include: {
      _count: { select: { pages: true } }
    },
    orderBy: { name: "asc" },
    take: limit
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    count: tag._count.pages
  }));
}

export async function getAllCategorySlugs() {
  const categories = await prisma.category.findMany({
    select: { slug: true }
  });
  return categories.map((category) => category.slug);
}

export async function getAllTagSlugs() {
  const tags = await prisma.tag.findMany({
    select: { slug: true }
  });
  return tags.map((tag) => tag.slug);
}

export async function getAllPublishedSlugs() {
  const pages = await prisma.coloringPage.findMany({
    where: { status: PageStatus.PUBLISHED },
    select: { slug: true }
  });
  return pages.map((page) => page.slug);
}

export async function getPagesByCategorySlug(slug: string) {
  return prisma.coloringPage.findMany({
    where: {
      status: PageStatus.PUBLISHED,
      categories: { some: { category: { slug } } }
    },
    orderBy: { createdAt: "desc" },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } }
    }
  });
}

export async function getPagesByTagSlug(slug: string) {
  return prisma.coloringPage.findMany({
    where: {
      status: PageStatus.PUBLISHED,
      tags: { some: { tag: { slug } } }
    },
    orderBy: { createdAt: "desc" },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } }
    }
  });
}

export async function getCategoryWithPages(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      pages: {
        include: {
          page: {
            include: {
              categories: { include: { category: true } },
              tags: { include: { tag: true } }
            }
          }
        },
        orderBy: { page: { createdAt: "desc" } }
      }
    }
  });

  if (!category) {
    return null;
  }

  return {
    ...category,
    pages: category.pages.map((relation) => relation.page)
  };
}

export async function getTagWithPages(slug: string) {
  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: {
      pages: {
        include: {
          page: {
            include: {
              categories: { include: { category: true } },
              tags: { include: { tag: true } }
            }
          }
        },
        orderBy: { page: { createdAt: "desc" } }
      }
    }
  });

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

export async function incrementViews(pageId: string) {
  return prisma.coloringPage.update({
    where: { id: pageId },
    data: {
      views: { increment: 1 }
    },
    select: { views: true }
  });
}
