import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DashboardStats = {
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  totalDownloads: number;
  totalViews: number;
  recentPages: Array<{
    id: string;
    title: string;
    slug: string;
    createdAt: Date;
    status: string;
    downloads: number;
  }>;
  downloadEvents: Array<{
    id: string;
    createdAt: Date;
    userAgent: string | null;
    page: {
      title: string;
      slug: string;
    };
  }>;
};

type AdminDashboardProps = {
  stats: DashboardStats;
};

const statusBadge: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-amber-100 text-amber-700"
};

export function AdminDashboard({ stats }: AdminDashboardProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Toplam Sayfa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-dark">
              {stats.totalPages}
            </p>
            <p className="text-xs text-brand-dark/60">
              {stats.publishedPages} yayınlandı
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>İndirmeler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-dark">
              {stats.totalDownloads}
            </p>
            <p className="text-xs text-brand-dark/60">Toplam indirme</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Görüntülemeler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-dark">
              {stats.totalViews}
            </p>
            <p className="text-xs text-brand-dark/60">Hızlı bakış</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Taslaklar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-dark">
              {stats.draftPages}
            </p>
            <p className="text-xs text-brand-dark/60">Yayınlanmayı bekliyor</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Son eklenen sayfalar</CardTitle>
              <p className="text-xs text-brand-dark/60">
                En yeni 5 içerik listelenir.
              </p>
            </div>
            <Link
              href="/ara"
              className="text-sm font-medium text-brand-dark hover:text-brand"
            >
              Siteyi görüntüle
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentPages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between rounded-2xl border border-brand-dark/10 bg-white/90 px-4 py-3"
              >
                <div>
                  <Link
                    href={`/sayfa/${page.slug}`}
                    className="text-sm font-semibold text-brand-dark hover:text-brand"
                  >
                    {page.title}
                  </Link>
                  <p className="text-xs text-brand-dark/50">
                    {page.downloads} indirme ·{" "}
                    {new Date(page.createdAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusBadge[page.status]}`}
                >
                  {page.status === "PUBLISHED" ? "Yayınlandı" : "Taslak"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>İndirme aktiviteleri</CardTitle>
            <p className="text-xs text-brand-dark/60">
              Son 10 indirme olayı listelenir.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.downloadEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-2xl border border-brand-dark/10 bg-white/90 px-4 py-3"
              >
                <div>
                  <Link
                    href={`/sayfa/${event.page.slug}`}
                    className="text-sm font-semibold text-brand-dark hover:text-brand"
                  >
                    {event.page.title}
                  </Link>
                  <p className="text-xs text-brand-dark/50">
                    {new Date(event.createdAt).toLocaleString("tr-TR")} ·{" "}
                    {event.userAgent?.slice(0, 40) ?? "bilinmiyor"}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-brand-dark/40" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
