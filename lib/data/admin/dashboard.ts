import { PageStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function getDashboardStats() {
  const [counts, downloads, views, recentPages, downloadEvents] =
    await Promise.all([
      prisma.coloringPage.groupBy({
        by: ["status"],
        _count: { _all: true }
      }),
      prisma.coloringPage.aggregate({
        _sum: { downloads: true }
      }),
      prisma.coloringPage.aggregate({
        _sum: { views: true }
      }),
      prisma.coloringPage.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          status: true,
          downloads: true,
          parent: { select: { slug: true } }
        }
      }),
      prisma.downloadEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          page: {
            select: {
              title: true,
              slug: true,
              parent: { select: { slug: true } }
            }
          },
          userAgent: true
        }
      })
    ]);

  const published =
    counts.find((entry) => entry.status === PageStatus.PUBLISHED)?._count
      ?._all ?? 0;
  const draft =
    counts.find((entry) => entry.status === PageStatus.DRAFT)?._count?._all ??
    0;
  const total = published + draft;

  return {
    totalPages: total,
    publishedPages: published,
    draftPages: draft,
    totalDownloads: downloads._sum.downloads ?? 0,
    totalViews: views._sum.views ?? 0,
    recentPages,
    downloadEvents
  };
}
