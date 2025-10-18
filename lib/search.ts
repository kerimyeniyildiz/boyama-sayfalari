import { PageStatus, Prisma } from "@prisma/client";

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
  const offset = (page - 1) * pageSize;

  const conditions: Prisma.Sql[] = [
    Prisma.sql`cp."status" = ${PageStatus.PUBLISHED}`
  ];

  let rankSql: Prisma.Sql = Prisma.sql`0::float AS rank`;

  if (filters.q) {
    const query = filters.q.trim();
    conditions.push(
      Prisma.sql`cp."searchVector" @@ plainto_tsquery('turkish', ${query})`
    );
    rankSql = Prisma.sql`ts_rank(cp."searchVector", plainto_tsquery('turkish', ${query})) AS rank`;
  }

  if (filters.age !== undefined) {
    conditions.push(
      Prisma.sql`((cp."ageMin" IS NULL OR cp."ageMin" <= ${filters.age}) AND (cp."ageMax" IS NULL OR cp."ageMax" >= ${filters.age}))`
    );
  }

  if (filters.categorySlug) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "ColoringPageCategory" cpc
        JOIN "Category" c ON cpc."categoryId" = c."id"
        WHERE cpc."pageId" = cp."id" AND c."slug" = ${filters.categorySlug}
      )`
    );
  }

  if (filters.tagSlug) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "ColoringPageTag" cpt
        JOIN "Tag" t ON cpt."tagId" = t."id"
        WHERE cpt."pageId" = cp."id" AND t."slug" = ${filters.tagSlug}
      )`
    );
  }

  const whereClause: Prisma.Sql =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, Prisma.sql` AND `)}`
      : Prisma.empty;

  const orderClause: Prisma.Sql = filters.q
    ? Prisma.sql`ORDER BY rank DESC, cp."createdAt" DESC`
    : Prisma.sql`ORDER BY cp."createdAt" DESC`;

  const rows = await prisma.$queryRaw<
    { id: string; rank: number }[]
  >(Prisma.sql`
    SELECT cp."id", ${rankSql}
    FROM "ColoringPage" cp
    ${whereClause}
    ${orderClause}
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const ids = rows.map((row) => row.id);

  const totalResult = await prisma.$queryRaw<
    { count: bigint }[]
  >(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM "ColoringPage" cp
    ${whereClause}
  `);

  const total = Number(totalResult[0]?.count ?? 0);

  if (ids.length === 0) {
    return {
      results: [],
      total,
      page,
      pageSize
    };
  }

  const pages = await prisma.coloringPage.findMany({
    where: { id: { in: ids } },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } }
    }
  });

  const byId = new Map(pages.map((entry) => [entry.id, entry]));
  const sorted = ids
    .map((id) => byId.get(id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return {
    results: sorted,
    total,
    page,
    pageSize
  };
}
