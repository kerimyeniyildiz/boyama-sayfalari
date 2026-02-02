"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageDeleteButton } from "@/components/admin/admin-page-delete-button";

type ChildPageSummary = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  downloads: number;
  createdAt: string;
};

type AdminChildPagesManagerProps = {
  parentId: string;
  parentEditId?: string;
  isMainPage: boolean;
  childPages: ChildPageSummary[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function AdminChildPagesManager({
  parentId,
  parentEditId,
  isMainPage,
  childPages
}: AdminChildPagesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setUploadError(null);

    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadError("Lütfen en az bir görsel seçin.");
      return;
    }

    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) => {
      formData.append("images", file);
    });

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/pages/${parentId}/children`, {
          method: "POST",
          body: formData
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            typeof data?.error?.message === "string"
              ? data.error.message
              : "Alt sayfa eklenirken bir hata oluştu.";
          toast.error(message);
          return;
        }

        toast.success("Alt sayfalar eklendi.");
        setSelectedFiles(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        router.refresh();
      } catch (error) {
        console.error("Alt sayfa eklenemedi", error);
        toast.error("Alt sayfa eklenirken beklenmedik bir hata oluştu.");
      }
    });
  };

  if (!isMainPage) {
    return (
      <section className="rounded-3xl border border-brand-dark/10 bg-white/90 p-6 shadow-card">
        <h2 className="text-lg font-semibold text-brand-dark">
          Alt sayfalar ana sayfadan yönetilir
        </h2>
        <p className="mt-2 text-sm text-brand-dark/70">
          Bu bir alt sayfa. Yeni alt sayfa eklemek için{" "}
          <Link
            href={
              parentEditId
                ? (`/admin/pages/${parentEditId}/edit` as Route)
                : "/admin/pages" as Route
            }
            className="font-semibold text-brand hover:text-brand-dark"
          >
            ana sayfa düzenleme ekranına
          </Link>{" "}
          gidin.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-3xl border border-brand-dark/10 bg-white/90 p-6 shadow-card">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-brand-dark">
          Alt boyama sayfaları
        </h2>
        <p className="text-sm text-brand-dark/70">
          Ana sayfaya bağlı alt boyama sayfalarını buradan yönetebilirsiniz.
        </p>
      </div>

      <div className="space-y-4">
        {childPages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-dark/20 bg-brand-light/30 px-4 py-6 text-sm text-brand-dark/70">
            Henüz alt boyama sayfası yok. Aşağıdan yeni görseller yükleyebilirsiniz.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {childPages.map((child) => (
              <div
                key={child.id}
                className="flex flex-col gap-3 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-card"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-brand-light">
                  {child.imageUrl ? (
                    <Image
                      src={child.imageUrl}
                      alt={child.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-brand-dark/40">
                      Önizleme yok
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-brand-dark">
                      {child.title}
                    </h3>
                    <p className="text-xs text-brand-dark/60">{child.slug}</p>
                    <p className="text-xs text-brand-dark/60">
                      {formatDate(child.createdAt)} · {child.downloads} indirme
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/${child.slug}` as Route}>
                        Görüntüle
                      </Link>
                    </Button>
                    <AdminPageDeleteButton
                      pageId={child.id}
                      pageTitle={child.title}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="space-y-3 border-t border-brand-dark/10 pt-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="child-images">Yeni alt sayfa görselleri</Label>
          <Input
            id="child-images"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            multiple
            ref={fileInputRef}
            disabled={isPending}
            onChange={(event) => {
              setSelectedFiles(event.target.files && event.target.files.length > 0 ? event.target.files : null);
              setUploadError(null);
            }}
          />
          <p className="text-xs text-brand-dark/60">
            Birden fazla görsel seçebilirsiniz. Her görsel ayrı bir alt sayfa olarak eklenir.
          </p>
          {uploadError ? (
            <p className="text-xs text-red-500">{uploadError}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Yükleniyor..." : "Alt sayfa ekle"}
          </Button>
        </div>
      </form>
    </section>
  );
}

