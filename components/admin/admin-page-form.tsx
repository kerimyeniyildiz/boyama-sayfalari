"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import slugify from "slugify";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { pageMetadataSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type PageFormValues = z.infer<typeof pageMetadataSchema>;

type InternalFormValues = PageFormValues & {
  pdf?: FileList;
  cover?: FileList;
};

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  count?: number;
};

type TagOption = {
  id: string;
  name: string;
  slug: string;
  count?: number;
};

type PagePayload = {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  orientation: string;
  ageMin: number | null;
  ageMax: number | null;
  artist: string | null;
  license: string | null;
  sourceUrl: string | null;
  status: string;
  language: string;
  categories: Array<{ category: { slug: string } }>;
  tags: Array<{ tag: { slug: string } }>;
};

type AdminPageFormProps = {
  page?: PagePayload | null;
  categories: CategoryOption[];
  tags: TagOption[];
};

const difficultyLabels: Record<string, string> = {
  EASY: "Kolay",
  MEDIUM: "Orta",
  HARD: "Zor"
};

const orientationLabels: Record<string, string> = {
  PORTRAIT: "Dikey",
  LANDSCAPE: "Yatay"
};

export function AdminPageForm({
  page,
  categories,
  tags
}: AdminPageFormProps) {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(Boolean(page?.slug));
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const defaultValues: InternalFormValues = {
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    description: page?.description ?? "",
    difficulty: (page?.difficulty as PageFormValues["difficulty"]) ?? "EASY",
    orientation:
      (page?.orientation as PageFormValues["orientation"]) ?? "PORTRAIT",
    ageMin: page?.ageMin ?? undefined,
    ageMax: page?.ageMax ?? undefined,
    artist: page?.artist ?? undefined,
    license: page?.license ?? undefined,
    sourceUrl: page?.sourceUrl ?? undefined,
    status: (page?.status as PageFormValues["status"]) ?? "DRAFT",
    language: page?.language ?? "tr",
    categories:
      page?.categories.map((item) => item.category.slug) ?? [],
    tags: page?.tags.map((item) => item.tag.slug) ?? [],
    width: undefined,
    height: undefined,
    fileSizeBytes: undefined,
    pdf: undefined,
    cover: undefined
  };

  const form = useForm<InternalFormValues>({
    resolver: zodResolver(pageMetadataSchema) as any,
    defaultValues
  });

  const pdfRegister = form.register("pdf", {
    onChange: (event) => {
      const files =
        (event.target as HTMLInputElement).files ?? undefined;
      form.setValue("pdf", files, { shouldDirty: true });
    }
  });
  const coverRegister = form.register("cover", {
    onChange: (event) => {
      const files =
        (event.target as HTMLInputElement).files ?? undefined;
      form.setValue("cover", files, { shouldDirty: true });
    }
  });

  const titleValue = form.watch("title");

  useEffect(() => {
    if (!slugEdited && titleValue) {
      form.setValue("slug", slugify(titleValue, { lower: true, locale: "tr" }));
    }
  }, [titleValue, slugEdited, form]);

  const onSubmit = form.handleSubmit((values) => {
    const formData = new FormData();

    formData.append("title", values.title);
    formData.append("slug", values.slug);
    formData.append("description", values.description);
    formData.append("difficulty", values.difficulty);
    formData.append("orientation", values.orientation);
    formData.append("status", values.status);
    formData.append("language", values.language);

    if (values.ageMin !== undefined) {
      formData.append("ageMin", String(values.ageMin));
    }
    if (values.ageMax !== undefined) {
      formData.append("ageMax", String(values.ageMax));
    }
    if (values.artist) {
      formData.append("artist", values.artist);
    }
    if (values.license) {
      formData.append("license", values.license);
    }
    if (values.sourceUrl) {
      formData.append("sourceUrl", values.sourceUrl);
    }

    values.categories.forEach((slug) =>
      formData.append("categories", slug)
    );
    values.tags.forEach((slug) => formData.append("tags", slug));

    const pdfFile = values.pdf?.[0];
    const coverFile = values.cover?.[0];

    if (pdfFile) {
      formData.append("pdf", pdfFile);
    }
    if (coverFile) {
      formData.append("cover", coverFile);
    }

    const endpoint = page
      ? `/api/admin/pages/${page.id}`
      : "/api/admin/pages";

    const method = page ? "PUT" : "POST";

    startTransition(async () => {
      setFormError(null);
      form.clearErrors();

      try {
        const response = await fetch(endpoint, {
          method,
          body: formData
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const errorMessage =
            typeof data?.error?.message === "string"
              ? data.error.message
              : "Kaydetme iÅŸlemi sÄ±rasÄ±nda bir hata oluÅŸtu.";
          const fieldErrors: Record<string, string[]> | undefined =
            data?.error?.fieldErrors;

          if (fieldErrors) {
            Object.entries(fieldErrors).forEach(([key, messages]) => {
              const message = messages?.[0];
              if (message) {
                form.setError(key as keyof InternalFormValues, {
                  type: "server",
                  message
                });
              }
            });
          }

          setFormError(errorMessage);
          toast.error(errorMessage);
          return;
        }

        const data = await response.json().catch(() => ({}));
        toast.success("Boyama sayfasÄ± kaydedildi.");
        router.push(`/sayfa/${data.page?.slug ?? values.slug}`);
        router.refresh();
      } catch (error) {
        console.error("Yeni sayfa kaydedilirken bir hata oluÅŸtu", error);
        const fallbackMessage =
          "Kaydetme iÅŸlemi sÄ±rasÄ±nda beklenmedik bir hata oluÅŸtu.";
        setFormError(fallbackMessage);
        toast.error(fallbackMessage);
      }
    });
  });

  const errors = form.formState.errors;

  return (
    <form
      className="space-y-8 rounded-3xl border border-brand-dark/10 bg-white/90 p-8 shadow-card"
      onSubmit={onSubmit}
    >
      {formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">BaÅŸlÄ±k</Label>
          <Input
            id="title"
            {...form.register("title")}
            disabled={isPending}
            placeholder="Ã–rn. Sevimli Orman ArkadaÅŸlarÄ±"
          />
          <p className="text-xs text-red-500">
            {errors.title?.message}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            {...form.register("slug", {
              onChange: () => setSlugEdited(true)
            })}
            disabled={isPending}
            placeholder="sevimli-orman-arkadaslari"
          />
          <p className="text-xs text-red-500">
            {errors.slug?.message}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">AÃ§Ä±klama</Label>
        <Textarea
          id="description"
          rows={4}
          {...form.register("description")}
          disabled={isPending}
          placeholder="Ã‡ocuÄŸunuzun hayal gÃ¼cÃ¼nÃ¼ destekleyen detaylÄ± aÃ§Ä±klama..."
        />
        <p className="text-xs text-red-500">
          {errors.description?.message}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Zorluk Seviyesi</Label>
          <Select
            defaultValue={defaultValues.difficulty}
            {...form.register("difficulty")}
            disabled={isPending}
          >
            {Object.entries(difficultyLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>YÃ¶nlendirme</Label>
          <Select
            defaultValue={defaultValues.orientation}
            {...form.register("orientation")}
            disabled={isPending}
          >
            {Object.entries(orientationLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ageMin">Minimum YaÅŸ</Label>
          <Input
            id="ageMin"
            type="number"
            min={0}
            max={18}
            disabled={isPending}
            {...form.register("ageMin", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ageMax">Maksimum YaÅŸ</Label>
          <Input
            id="ageMax"
            type="number"
            min={0}
            max={18}
            disabled={isPending}
            {...form.register("ageMax", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="artist">Ã‡izer</Label>
          <Input id="artist" disabled={isPending} {...form.register("artist")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="license">Lisans</Label>
          <Input
            id="license"
            disabled={isPending}
            {...form.register("license")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sourceUrl">Kaynak URL</Label>
        <Input
          id="sourceUrl"
          type="url"
          disabled={isPending}
          {...form.register("sourceUrl")}
          placeholder="https://"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Kategoriler</Label>
          <div className="grid gap-2 rounded-2xl border border-brand-dark/10 bg-white p-4">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-brand-dark/10 px-3 py-2 text-sm"
              >
                <span>{category.name}</span>
                <input
                  type="checkbox"
                  value={category.slug}
                  disabled={isPending}
                  defaultChecked={defaultValues.categories.includes(
                    category.slug
                  )}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    const value = event.target.value;
                    const current = form.getValues("categories");
                    if (checked && !current.includes(value)) {
                      form.setValue("categories", [...current, value], {
                        shouldDirty: true
                      });
                    }
                    if (!checked) {
                      form.setValue(
                        "categories",
                        current.filter((item) => item !== value),
                        { shouldDirty: true }
                      );
                    }
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Etiketler</Label>
          <div className="grid gap-2 rounded-2xl border border-brand-dark/10 bg-white p-4">
            {tags.map((tag) => (
              <label
                key={tag.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-brand-dark/10 px-3 py-2 text-sm"
              >
                <span>#{tag.name}</span>
                <input
                  type="checkbox"
                  value={tag.slug}
                  disabled={isPending}
                  defaultChecked={defaultValues.tags.includes(tag.slug)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    const value = event.target.value;
                    const current = form.getValues("tags");
                    if (checked && !current.includes(value)) {
                      form.setValue("tags", [...current, value], {
                        shouldDirty: true
                      });
                    }
                    if (!checked) {
                      form.setValue(
                        "tags",
                        current.filter((item) => item !== value),
                        { shouldDirty: true }
                      );
                    }
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pdf">PDF DosyasÄ±</Label>
          <Input
            id="pdf"
            type="file"
            accept="application/pdf"
            disabled={isPending}
            {...pdfRegister}
          />
          <p className="text-xs text-brand-dark/60">
            {page
              ? "Slug deÄŸiÅŸikliklerinde PDF dosyasÄ±nÄ± yeniden yÃ¼kleyin."
              : "PDF dosyasÄ± zorunludur."}
          </p>
          {errors.pdf?.message ? (
            <p className="text-xs text-red-500">{errors.pdf.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover">Kapak GÃ¶rseli</Label>
          <Input
            id="cover"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isPending}
            {...coverRegister}
          />
          <p className="text-xs text-brand-dark/60">
            En iyi sonuÃ§ iÃ§in 1600px geniÅŸliÄŸinde gÃ¶rsel yÃ¼kleyin.
          </p>
          {errors.cover?.message ? (
            <p className="text-xs text-red-500">{errors.cover.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1 text-xs text-brand-dark/60">
          <p>
            {page
              ? "DeÄŸiÅŸiklikler kaydedildiÄŸinde sayfa yeniden yayÄ±nlanÄ±r."
              : "Yeni sayfa varsayÄ±lan olarak taslak olarak kaydedilir."}
          </p>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}


