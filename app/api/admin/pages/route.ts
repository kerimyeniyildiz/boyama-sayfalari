import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PageStatus } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { pageMetadataSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { generateImageAssets, generatePdfFromImage, getBufferSize } from "@/lib/images";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import {
  getAdminPages,
  parseAdminPageListFilters
} from "@/lib/data/admin/pages";

export const runtime = "nodejs";

const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PDF_CACHE_CONTROL = "public, max-age=31536000, immutable";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml"
]);

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};

function jsonError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>
) {
  const body: ErrorResponse = {
    error: {
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {})
    }
  };

  return NextResponse.json(body, { status });
}

function normalizeFieldErrors(
  fieldErrors: Record<string, string[] | undefined>
): Record<string, string[]> | undefined {
  const entries = Object.entries(fieldErrors).filter(
    (entry): entry is [string, string[]] =>
      Array.isArray(entry[1]) && entry[1].length > 0
  );

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function toString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function collectStrings(values: FormDataEntryValue[]): string[] {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseAdminPageListFilters(
      Object.fromEntries(url.searchParams.entries())
    );
    const result = await getAdminPages(filters);

    return NextResponse.json({
      data: result.items,
      pagination: result.pagination,
      filters: result.filters
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = normalizeFieldErrors(error.flatten().fieldErrors);
      return jsonError(
        400,
        "INVALID_QUERY",
        "Geçersiz filtre parametreleri.",
        fieldErrors
      );
    }

    console.error("Admin page listesi getirilirken hata oluştu", error);
    return jsonError(
      500,
      "PAGE_LIST_FAILED",
      "Sayfalar yüklenirken bir hata oluştu."
    );
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const rawImage = (formData.get("image") ?? formData.get("cover")) as
    | File
    | null;
  const extraImages = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!(rawImage instanceof File) || rawImage.size === 0) {
    return jsonError(400, "IMAGE_REQUIRED", "Görsel yüklenmedi.", {
      image: ["Görsel yüklenmesi zorunludur."]
    });
  }

  const allImages = [rawImage, ...extraImages];

  for (const image of allImages) {
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return jsonError(
        400,
        "INVALID_IMAGE_TYPE",
        "Görsel yalnızca PNG, JPEG, SVG veya WebP formatında olabilir.",
        {
          image: ["Görsel yalnızca PNG, JPEG, SVG veya WebP formatında olabilir."]
        }
      );
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return jsonError(
        400,
        "IMAGE_TOO_LARGE",
        `Görsel ${MAX_IMAGE_SIZE / (1024 * 1024)}MB sınırını aşıyor.`,
        {
          image: [`Görsel ${MAX_IMAGE_SIZE / (1024 * 1024)}MB sınırını aşıyor.`]
        }
      );
    }
  }

  const title = toString(formData.get("title"));
  const rawSlug = toString(formData.get("slug"));
  const submittedCategories = collectStrings(formData.getAll("categories"));
  const submittedTags = collectStrings(formData.getAll("tags"));

  const metadataInput = {
    title,
    slug: rawSlug ? slugify(rawSlug) : slugify(title),
    categories: submittedCategories,
    tags: submittedTags
  };

  const parsed = pageMetadataSchema.safeParse(metadataInput);
  if (!parsed.success) {
    const fieldErrors = normalizeFieldErrors(parsed.error.flatten().fieldErrors);
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Form alanlarında hatalar var.",
      fieldErrors
    );
  }

  const metadata = parsed.data;

  const imageBuffer = Buffer.from(await rawImage.arrayBuffer());
  const pdfBuffer = await generatePdfFromImage(imageBuffer);
  const assets = await generateImageAssets(imageBuffer);

  const pdfKey = `pdf/${metadata.slug}.pdf`;
  const coverKey = `cover/${metadata.slug}.webp`;
  const thumbKeyLarge = `thumb/${metadata.slug}-800.webp`;
  const thumbKeySmall = `thumb/${metadata.slug}-400.webp`;

  const uploadedKeys: string[] = [];
  const extraAssetRecords: Array<{
    pdfKey: string;
    coverImageKey: string;
    thumbLargeKey: string;
    thumbSmallKey: string;
    width: number;
    height: number;
    fileSizeBytes: number;
    position: number;
  }> = [];

  try {
    await uploadToR2({
      key: pdfKey,
      body: pdfBuffer,
      contentType: "application/pdf",
      cacheControl: PDF_CACHE_CONTROL
    });
    uploadedKeys.push(pdfKey);

    await uploadToR2({
      key: coverKey,
      body: assets.cover,
      contentType: "image/webp",
      cacheControl: IMAGE_CACHE_CONTROL
    });
    uploadedKeys.push(coverKey);

    await uploadToR2({
      key: thumbKeySmall,
      body: assets.thumbSmall,
      contentType: "image/webp",
      cacheControl: IMAGE_CACHE_CONTROL
    });
    uploadedKeys.push(thumbKeySmall);

    await uploadToR2({
      key: thumbKeyLarge,
      body: assets.thumbLarge,
      contentType: "image/webp",
      cacheControl: IMAGE_CACHE_CONTROL
    });
    uploadedKeys.push(thumbKeyLarge);

    for (let index = 0; index < extraImages.length; index += 1) {
      const file = extraImages[index];
      const extraBuffer = Buffer.from(await file.arrayBuffer());
      const extraPdfBuffer = await generatePdfFromImage(extraBuffer);
      const extraAssets = await generateImageAssets(extraBuffer);

      const suffix = index + 2;
      const extraPdfKey = `pdf/${metadata.slug}-${suffix}.pdf`;
      const extraCoverKey = `cover/${metadata.slug}-${suffix}.webp`;
      const extraThumbSmallKey = `thumb/${metadata.slug}-${suffix}-400.webp`;
      const extraThumbLargeKey = `thumb/${metadata.slug}-${suffix}-800.webp`;

      await uploadToR2({
        key: extraPdfKey,
        body: extraPdfBuffer,
        contentType: "application/pdf",
        cacheControl: PDF_CACHE_CONTROL
      });
      uploadedKeys.push(extraPdfKey);

      await uploadToR2({
        key: extraCoverKey,
        body: extraAssets.cover,
        contentType: "image/webp",
        cacheControl: IMAGE_CACHE_CONTROL
      });
      uploadedKeys.push(extraCoverKey);

      await uploadToR2({
        key: extraThumbSmallKey,
        body: extraAssets.thumbSmall,
        contentType: "image/webp",
        cacheControl: IMAGE_CACHE_CONTROL
      });
      uploadedKeys.push(extraThumbSmallKey);

      await uploadToR2({
        key: extraThumbLargeKey,
        body: extraAssets.thumbLarge,
        contentType: "image/webp",
        cacheControl: IMAGE_CACHE_CONTROL
      });
      uploadedKeys.push(extraThumbLargeKey);

      extraAssetRecords.push({
        pdfKey: extraPdfKey,
        coverImageKey: extraCoverKey,
        thumbLargeKey: extraThumbLargeKey,
        thumbSmallKey: extraThumbSmallKey,
        width: extraAssets.width,
        height: extraAssets.height,
        fileSizeBytes: getBufferSize(extraPdfBuffer),
        position: index + 1
      });
    }

    const [categories, tags] = await Promise.all([
      prisma.category.findMany({
        where: { slug: { in: metadata.categories } },
        select: { id: true }
      }),
      prisma.tag.findMany({
        where: { slug: { in: metadata.tags } },
        select: { id: true }
      })
    ]);

    const page = await prisma.coloringPage.create({
      data: {
        slug: metadata.slug,
        title: metadata.title,
        description: `${metadata.title} boyama sayfası.`,
        orientation: "PORTRAIT",
        status: PageStatus.PUBLISHED,
        language: "tr",
        pdfKey,
        coverImageKey: coverKey,
        thumbWebpKey: thumbKeyLarge,
        width: assets.width,
        height: assets.height,
        fileSizeBytes: getBufferSize(pdfBuffer),
        categories: {
          create: categories.map((category) => ({
            category: { connect: { id: category.id } }
          }))
        },
        tags: {
          create: tags.map((tag) => ({
            tag: { connect: { id: tag.id } }
          }))
        },
        assets: {
          create: extraAssetRecords
        }
      }
    });

    revalidatePath("/");
    revalidatePath(`/sayfa/${page.slug}`);
    revalidatePath("/ara");
    revalidatePath("/admin/pages");
    revalidatePath("/admin/pages/new");
    metadata.categories.forEach((slug) => {
      revalidatePath(`/kategori/${slug}`);
    });
    metadata.tags.forEach((slug) => {
      revalidatePath(`/etiket/${slug}`);
    });

    return NextResponse.json({ success: true, page });
  } catch (error) {
    await Promise.all(
      uploadedKeys.map((key) => deleteFromR2(key).catch(() => undefined))
    );
    console.error("Yeni sayfa oluşturulamadı", error);
    return jsonError(
      500,
      "PAGE_CREATE_FAILED",
      "Sayfa oluşturulurken bir hata oluştu."
    );
  }
}

