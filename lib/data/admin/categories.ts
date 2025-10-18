import { prisma } from "@/lib/db";

export type AdminCategorySummary = {
  id: string;
  name: string;
  slug: string;
  pageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function getAdminCategories(): Promise<AdminCategorySummary[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { pages: true } }
    }
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    pageCount: category._count.pages,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt
  }));
}
