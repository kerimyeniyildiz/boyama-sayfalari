import { prisma } from "@/lib/db";

export type AdminTagSummary = {
  id: string;
  name: string;
  slug: string;
  pageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function getAdminTags(): Promise<AdminTagSummary[]> {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { pages: true } }
    }
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    pageCount: tag._count.pages,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt
  }));
}
