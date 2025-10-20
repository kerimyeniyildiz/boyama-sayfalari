"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import slugify from "slugify";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { pageMetadataSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { SimpleRichTextEditor } from "@/components/admin/simple-rich-text-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageFormValues = z.infer<typeof pageMetadataSchema>;

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
  categories: Array<{ category: { slug: string } }>;
  tags: Array<{ tag: { slug: string } }>;
  seoContent: string | null;
};

type AdminPageFormProps = {
  page?: PagePayload | null;
  categories: CategoryOption[];
  tags: TagOption[];
};

export function AdminPageForm({ page, categories, tags }: AdminPageFormProps) {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(Boolean(page?.slug));
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<FileList | null>(null);
  const [promptFile, setPromptFile] = useState<File | null>(null);

  const defaultValues: PageFormValues = {
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    categories: page?.categories.map((item) => item.category.slug) ?? [],
    tags: page?.tags.map((item) => item.tag.slug) ?? [],
    seoContent: page?.seoContent ?? ""
  };

  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageMetadataSchema),
    defaultValues
  });

  const titleValue = form.watch("title");

  useEffect(() => {
    if (!slugEdited && titleValue) {
      form.setValue("slug", slugify(titleValue, { lower: true, locale: "tr" }));
    }
  }, [titleValue, slugEdited, form]);

  const errors = form.formState.errors;

  const handleSubmit = form.handleSubmit((values) => {
    const formData = new FormData();

    formData.append("title", values.title);
    formData.append("slug", values.slug);
    formData.append("seoContent", values.seoContent ?? "");
    values.categories.forEach((slug) => formData.append("categories", slug));
    values.tags.forEach((slug) => formData.append("tags", slug));

    if (promptFile) {
      formData.append("promptFile", promptFile);
    }

    const files = selectedImage ? Array.from(selectedImage) : [];
    if (files.length > 0) {
      formData.append("image", files[0]);
      files.slice(1).forEach((file) => {
        formData.append("images", file);
      });
    }

    const endpoint = page ? `/api/admin/pages/${page.id}` : "/api/admin/pages";
    const method = page ? "PUT" : "POST";

    startTransition(async () => {
      setFormError(null);
      setImageError(null);
      form.clearErrors();

      try {
        const response = await fetch(endpoint, {
          method,
          body: formData
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            typeof data?.error?.message === "string"
              ? data.error.message
              : "Kaydetme işlemi sırasında bir hata oluştu.";
          const fieldErrors: Record<string, string[]> | undefined =
            data?.error?.fieldErrors;

          if (fieldErrors) {
            Object.entries(fieldErrors).forEach(([key, messages]) => {
              const messageText = messages?.[0];
              if (messageText) {
                if (key === "image") {
                  setImageError(messageText);
                  return;
                }
                form.setError(key as keyof PageFormValues, {
                  type: "server",
                  message: messageText
                });
              }
            });
          }

          setFormError(message);
          toast.error(message);
          return;
        }

        toast.success("Boyama sayfası kaydedildi.");
        router.push("/admin/pages");
        router.refresh();
      } catch (error) {
        console.error("Yeni sayfa kaydedilirken bir hata oluştu", error);
        const message = "Kaydetme işlemi sırasında beklenmedik bir hata oluştu.";
        setFormError(message);
        toast.error(message);
      }
    });
  });

  return (
    <form
      className="space-y-8 rounded-3xl border border-brand-dark/10 bg-white/90 p-8 shadow-card"
      onSubmit={handleSubmit}
    >
      {formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Başlık</Label>
          <Input
            id="title"
            {...form.register("title")}
            disabled={isPending}
            placeholder="Örn. Sevimli Orman Arkadaşları"
          />
          {errors.title?.message ? (
            <p className="text-xs text-red-500">{errors.title.message}</p>
          ) : null}
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
          {errors.slug?.message ? (
            <p className="text-xs text-red-500">{errors.slug.message}</p>
          ) : null}
        </div>
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

      <div className="space-y-2">
        <Label htmlFor="promptFile">TXT prompt dosyası</Label>
        <Input
          id="promptFile"
          type="file"
          accept=".txt"
          disabled={isPending}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setPromptFile(file);
            if (file) {
              setSelectedImage(null);
              setImageError(null);
            }
          }}
        />
        <p className="text-xs text-brand-dark/60">
          Her satır için bir görsel üretim promptu içeren TXT dosyasını yükleyebilirsiniz. Dosya boşsa bu adım atlanır.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seoContent">SEO metni</Label>
        <Controller
          name="seoContent"
          control={form.control}
          render={({ field }) => (
            <SimpleRichTextEditor
              id="seoContent"
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={isPending}
            />
          )}
        />
        <p className="text-xs text-brand-dark/60">
          Bu içerik ana koleksiyon sayfalarında “Boyama sayfalarını keşfet” bölümünün üstünde görüntülenir.
        </p>
        {errors.seoContent?.message ? (
          <p className="text-xs text-red-500">{errors.seoContent.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Görsel</Label>
        <Input
          id="image"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={isPending}
          onChange={(event) => {
            const files = event.target.files;
            setSelectedImage(files && files.length > 0 ? files : null);
            setImageError(null);
          }}
        />
        <p className="text-xs text-brand-dark/60">
          TXT dosyası yüklemediyseniz en az bir dikey görsel seçin. Dosya yüklediyseniz bu alanı boş bırakabilirsiniz.
        </p>
        {imageError ? (
          <p className="text-xs text-red-500">{imageError}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1 text-xs text-brand-dark/60">
          <p>Görsel yüklendiğinde PDF ve WebP versiyonları otomatik üretilir.</p>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

