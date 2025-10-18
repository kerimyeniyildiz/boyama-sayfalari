import { PageStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { adminPageListQuerySchema } from "@/lib/validation";

export type AdminPageListFilters = ReturnType<typeof parseAdminPageListFilters>;

export type AdminPageListResult = {
  items: Array<{
    id: string;
    title: string;
    slug: string;
    status: PageStatus;
    downloads: number;
    language: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status: "ALL" | PageStatus;
    query?: string;
  };
};

export function parseAdminPageListFilters(
  params: Record<string, string | undefined>
) {
  const parsed = adminPageListQuerySchema.parse(params);
  return parsed;
}

export async function getAdminPages(
  filters: AdminPageListFilters
): Promise<AdminPageListResult> {
  const page = filters.page;
  const pageSize = filters.pageSize;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ColoringPageWhereInput = {
    parentId: null
  };

  if (filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query, mode: "insensitive" } },
      { slug: { contains: filters.query, mode: "insensitive" } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.coloringPage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        downloads: true,
        language: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.coloringPage.count({ where })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    },
    filters: {
      status: filters.status,
      query: filters.query
    }
  };
}
