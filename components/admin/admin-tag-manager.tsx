"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { AdminTagSummary } from "@/lib/data/admin/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminTagManagerProps = {
  tags: AdminTagSummary[];
};

export function AdminTagManager({ tags }: AdminTagManagerProps) {
  const router = useRouter();
  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();

    if (!name) {
      toast.error("Etiket adı gereklidir.");
      return;
    }

    startCreateTransition(async () => {
      try {
        const response = await fetch("/api/admin/tags", {
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
              : "Etiket oluşturulurken bir hata oluştu.";
          toast.error(message);
          return;
        }

        event.currentTarget.reset();
        toast.success("Etiket oluşturuldu.");
        router.refresh();
      } catch (error) {
        console.error("Etiket oluşturma isteği başarısız", error);
        toast.error("Etiket oluşturulurken beklenmedik bir hata oluştu.");
      }
    });
  };

  const handleDelete = (id: string, name: string, pageCount: number) => {
    if (pageCount > 0) {
      toast.error(
        `"${name}" etiketine bağlı sayfalar bulunduğu için silme işlemi engellendi.`
      );
      return;
    }

    const confirmed = window.confirm(
      `"${name}" etiketini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
    );

    if (!confirmed) {
      return;
    }

    startDeleteTransition(async () => {
      try {
        const response = await fetch(`/api/admin/tags/${id}`, {
          method: "DELETE"
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            typeof data?.error?.message === "string"
              ? data.error.message
              : "Etiket silinirken bir hata oluştu.";
          toast.error(message);
          return;
        }

        toast.success("Etiket silindi.");
        router.refresh();
      } catch (error) {
        console.error("Etiket silme isteği başarısız", error);
        toast.error("Etiket silinirken beklenmedik bir hata oluştu.");
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
            Etiket adı
          </label>
          <Input
            name="name"
            placeholder="Örn. fantastik"
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
            placeholder="fantastik"
            maxLength={100}
            disabled={isCreating}
          />
          <p className="text-xs text-brand-dark/50">
            Boş bırakırsanız isimden otomatik üretilecektir.
          </p>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "Ekleniyor..." : "Etiket Ekle"}
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
            {tags.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-brand-dark/60"
                >
                  Henüz etiket eklenmemiş.
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-brand-light/40">
                  <td className="px-6 py-4">
                    <div className="font-medium text-brand-dark">
                      {tag.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-brand-dark/70">{tag.slug}</td>
                  <td className="px-6 py-4 text-right text-brand-dark">
                    {tag.pageCount}
                  </td>
                  <td className="px-6 py-4 text-brand-dark/60">
                    {new Date(tag.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting || tag.pageCount > 0}
                      onClick={() =>
                        handleDelete(tag.id, tag.name, tag.pageCount)
                      }
                      title={
                        tag.pageCount > 0
                          ? "Önce bu etikete bağlı sayfaları kaldırın."
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
