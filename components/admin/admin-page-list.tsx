import Link from "next/link";
import type { Route } from "next";
import type { PageStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { AdminPageListResult } from "@/lib/data/admin/pages";
import { AdminPageDeleteButton } from "@/components/admin/admin-page-delete-button";
import { buildColoringPagePath } from "@/lib/page-paths";

type AdminPageListProps = AdminPageListResult;

const statusLabels: Record<"ALL" | PageStatus, string> = {
  ALL: "Tümü",
  PUBLISHED: "Yayınlandı",
  DRAFT: "Taslak"
};

function formatDate(date: Date) {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function buildQueryObject(
  base: AdminPageListResult["filters"],
  pageSize: number,
  overrides: Partial<{ page: number; status: "ALL" | PageStatus; query?: string }>
) {
  const query: Record<string, string> = {
    pageSize: pageSize.toString()
  };

  const statusValue = overrides.status ?? base.status;
  if (statusValue && statusValue !== "ALL") {
    query.status = statusValue;
  }

  const queryValue =
    overrides.query !== undefined ? overrides.query : base.query;
  if (queryValue) {
    query.query = queryValue;
  }

  const pageValue = overrides.page ?? 1;
  if (pageValue > 1) {
    query.page = pageValue.toString();
  }

  return query;
}

export function AdminPageList({ items, pagination, filters }: AdminPageListProps) {
  const prevDisabled = pagination.page <= 1;
  const nextDisabled = pagination.page >= pagination.totalPages;

  const prevQuery = buildQueryObject(filters, pagination.pageSize, {
    page: Math.max(1, pagination.page - 1)
  });
  const nextQuery = buildQueryObject(filters, pagination.pageSize, {
    page: Math.min(pagination.totalPages, pagination.page + 1)
  });

  const resetNeeded =
    filters.status !== "ALL" || (filters.query && filters.query.length > 0);

  return (
    <div className="space-y-6">
      <form className="grid gap-4 rounded-3xl border border-brand-dark/10 bg-white/90 p-6 shadow-card md:grid-cols-[1fr_auto_auto]">
        <input type="hidden" name="pageSize" value={pagination.pageSize} />
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-brand-dark/70">
            Ara
          </label>
          <Input
            name="query"
            defaultValue={filters.query ?? ""}
            placeholder="Başlık veya slug ile ara"
          />
        </div>
        <div className="flex flex-col gap-2 md:w-48">
          <label className="text-sm font-medium text-brand-dark/70">
            Durum
          </label>
          <Select name="status" defaultValue={filters.status}>
            <option value="ALL">Tümü</option>
            <option value="PUBLISHED">Yayınlandı</option>
            <option value="DRAFT">Taslak</option>
          </Select>
        </div>
        <div className="flex items-end gap-3">
          <Button type="submit">Filtrele</Button>
          {resetNeeded ? (
            <Button type="button" variant="ghost" asChild>
              <Link href="/admin/pages">Sıfırla</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <div className="rounded-3xl border border-brand-dark/10 bg-white/90 shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-dark/10">
            <thead className="bg-brand-light/50">
              <tr className="text-left text-xs uppercase tracking-wider text-brand-dark/60">
                <th className="px-6 py-3 font-medium">Başlık</th>
                <th className="px-6 py-3 font-medium">Slug</th>
                <th className="px-6 py-3 font-medium">Durum</th>
                <th className="px-6 py-3 font-medium text-right">
                  İndirme
                </th>
                <th className="px-6 py-3 font-medium">Güncellendi</th>
                <th className="px-6 py-3 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark/10 text-sm">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-brand-dark/60">
                    Kriterlere uygun sonuç bulunamadı.
                  </td>
                </tr>
              ) : (
                items.map((page) => (
                  <tr key={page.id} className="hover:bg-brand-light/40">
                    <td className="px-6 py-4">
                      <div className="font-medium text-brand-dark">
                        {page.title}
                      </div>
                      <div className="text-xs text-brand-dark/50">
                        {page.language.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-brand-dark/70">
                      {page.slug}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={page.status === "PUBLISHED" ? "default" : "outline"}
                      >
                        {statusLabels[page.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-brand-dark">
                      {page.downloads.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-brand-dark/70">
                      {formatDate(page.updatedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/admin/pages/${page.id}/edit` as Route}
                          >
                            Düzenle
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            href={buildColoringPagePath({ slug: page.slug }) as Route}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Görüntüle
                          </Link>
                        </Button>
                        <AdminPageDeleteButton
                          pageId={page.id}
                          pageTitle={page.title}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4 border-t border-brand-dark/10 px-6 py-4 text-sm text-brand-dark/70 md:flex-row md:items-center md:justify-between">
          <div>
            Toplam {pagination.total.toLocaleString("tr-TR")} kayıt
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" disabled={prevDisabled}>
              <Link
                aria-disabled={prevDisabled}
                href={
                  prevDisabled
                    ? "/admin/pages"
                    : {
                        pathname: "/admin/pages",
                        query: prevQuery
                      }
                }
              >
                Önceki
              </Link>
            </Button>
            <div className="text-xs text-brand-dark/60">
              Sayfa {pagination.page} / {pagination.totalPages}
            </div>
            <Button asChild variant="outline" size="sm" disabled={nextDisabled}>
              <Link
                aria-disabled={nextDisabled}
                href={
                  nextDisabled
                    ? "/admin/pages"
                    : {
                        pathname: "/admin/pages",
                        query: nextQuery
                      }
                }
              >
                Sonraki
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
