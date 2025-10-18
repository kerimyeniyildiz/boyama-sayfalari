import Link from "next/link";
import { ZodError } from "zod";

import { Button } from "@/components/ui/button";
import { AdminPageList } from "@/components/admin/admin-page-list";
import {
  getAdminPages,
  parseAdminPageListFilters
} from "@/lib/data/admin/pages";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function normaliseSearchParams(
  params: Record<string, string | string[] | undefined>
) {
  const result: Record<string, string | undefined> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      result[key] = value[0];
    } else if (typeof value === "string") {
      result[key] = value;
    }
  });

  return result;
}

export default async function AdminPagesPage({ searchParams }: PageProps) {
  const normalized = normaliseSearchParams(searchParams);
  let filters;
  let filterErrors: string[] = [];

  try {
    filters = parseAdminPageListFilters(normalized);
  } catch (error) {
    if (error instanceof ZodError) {
      filterErrors = Object.values(error.flatten().fieldErrors)
        .flat()
        .filter((message): message is string => Boolean(message));
      filters = parseAdminPageListFilters({});
    } else {
      throw error;
    }
  }

  const result = await getAdminPages(filters);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">
            Boyama Sayfaları
          </h1>
          <p className="text-sm text-brand-dark/70">
            Yayınlanan ve taslak durumundaki tüm boyama sayfalarını yönetin.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/pages/new">Yeni Sayfa</Link>
        </Button>
      </div>

      {filterErrors.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {filterErrors.join(" ")}
        </div>
      ) : null}

      <AdminPageList {...result} />
    </div>
  );
}
