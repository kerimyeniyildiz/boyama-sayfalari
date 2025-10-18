"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { AdminCategorySummary } from "@/lib/data/admin/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminCategoryManagerProps = {
  categories: AdminCategorySummary[];
};

export function AdminCategoryManager({
  categories
}: AdminCategoryManagerProps) {
  const router = useRouter();
  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();

    if (!name) {
      toast.error("Kategori adı gereklidir.");
      return;
    }

    startCreateTransition(async () => {
      try {
        const response = await fetch("/api/admin/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            slug: slug.length ? slug : undefined
          })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            typeof data?.error?.message === "string"
              ? data.error.message
              : "Kategori oluşturulurken bir hata oluştu.";
          toast.error(message);
          return;
        }

        event.currentTarget.reset();
        toast.success("Kategori oluşturuldu.");
        router.refresh();
      } catch (error) {
        console.error("Kategori oluşturma isteği başarısız", error);
        toast.error("Kategori oluşturulurken beklenmedik bir hata oluştu.");
      }
    });
  };

  const handleDelete = (id: string, name: string, pageCount: number) => {
    if (pageCount > 0) {
      toast.error(
        `"${name}" kategorisine bağlı sayfalar bulunduğu için silme işlemi engellendi.`
      );
      return;
    }

    const confirmed = window.confirm(
      `"${name}" kategorisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
    );

    if (!confirmed) {
      return;
    }

    startDeleteTransition(async () => {
      try {
        const response = await fetch(`/api/admin/categories/${id}`, {
          method: "DELETE"
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            typeof data?.error?.message === "string"
              ? data.error.message
              : "Kategori silinirken bir hata oluştu.";
          toast.error(message);
          return;
        }

        toast.success("Kategori silindi.");
        router.refresh();
      } catch (error) {
        console.error("Kategori silme isteği başarısız", error);
        toast.error("Kategori silinirken beklenmedik bir hata oluştu.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-3xl border border-brand-dark/10 bg-white/90 p-6 shadow-card md:grid-cols-[2fr_2fr_auto]"
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-brand-dark/70">
            Kategori adı
          </label>
          <Input
            name="name"
            placeholder="Örn. Hayvanlar"
            maxLength={80}
            required
            disabled={isCreating}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-brand-dark/70">
            Slug (opsiyonel)
          </label>
          <Input
            name="slug"
            placeholder="hayvanlar"
            maxLength={100}
            disabled={isCreating}
          />
          <p className="text-xs text-brand-dark/50">
            Boş bırakırsanız isimden otomatik üretilecektir.
          </p>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "Ekleniyor..." : "Kategori Ekle"}
          </Button>
        </div>
      </form>

      <div className="rounded-3xl border border-brand-dark/10 bg-white/90 shadow-card">
        <table className="min-w-full divide-y divide-brand-dark/10">
          <thead className="bg-brand-light/50">
            <tr className="text-left text-xs uppercase tracking-wider text-brand-dark/60">
              <th className="px-6 py-3 font-medium">Adı</th>
              <th className="px-6 py-3 font-medium">Slug</th>
              <th className="px-6 py-3 font-medium text-right">
                Sayfa Sayısı
              </th>
              <th className="px-6 py-3 font-medium">Oluşturuldu</th>
              <th className="px-6 py-3 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-dark/10 text-sm">
            {categories.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-brand-dark/60"
                >
                  Henüz kategori eklenmemiş.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-brand-light/40">
                  <td className="px-6 py-4">
                    <div className="font-medium text-brand-dark">
                      {category.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-brand-dark/70">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 text-right text-brand-dark">
                    {category.pageCount}
                  </td>
                  <td className="px-6 py-4 text-brand-dark/60">
                    {new Date(category.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting || category.pageCount > 0}
                      onClick={() =>
                        handleDelete(
                          category.id,
                          category.name,
                          category.pageCount
                        )
                      }
                      title={
                        category.pageCount > 0
                          ? "Önce bu kategoriye bağlı sayfaları kaldırın."
                          : undefined
                      }
                    >
                      Sil
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
