import { PageStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type SearchFilters = {
  q?: string;
  categorySlug?: string;
  tagSlug?: string;
  age?: number;
  page?: number;
  pageSize?: number;
};

export async function searchColoringPages(filters: SearchFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const query = filters.q?.trim();

  const where: Prisma.ColoringPageWhereInput = {
    status: PageStatus.PUBLISHED,
    parentId: null,
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { seoContent: { contains: query } }
          ]
        }
      : {}),
    ...(filters.age !== undefined
      ? {
          AND: [
            { OR: [{ ageMin: null }, { ageMin: { lte: filters.age } }] },
            { OR: [{ ageMax: null }, { ageMax: { gte: filters.age } }] }
          ]
        }
      : {}),
    ...(filters.categorySlug
      ? {
          categories: {
            some: { category: { slug: filters.categorySlug } }
          }
        }
      : {}),
    ...(filters.tagSlug
      ? {
          tags: { some: { tag: { slug: filters.tagSlug } } }
        }
      : {})
  };

  const [total, results] = await prisma.$transaction([
    prisma.coloringPage.count({ where }),
    prisma.coloringPage.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        parent: { select: { slug: true } }
      },
      orderBy: [{ downloads: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return { results, total, page, pageSize };
}
