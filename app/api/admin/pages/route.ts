import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { pageMetadataSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { generateWebpVariants, getBufferSize } from "@/lib/images";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import {
  getAdminPages,
  parseAdminPageListFilters
} from "@/lib/data/admin/pages";

export const runtime = "nodejs";

const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PDF_CACHE_CONTROL = "public, max-age=31536000, immutable";
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const PDF_CONTENT_TYPE = "application/pdf";
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

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

function toOptionalString(value: FormDataEntryValue | null): string | undefined {
  const parsed = toString(value);
  return parsed.length ? parsed : undefined;
}

function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/svg+xml") return "svg";
  return mimeType.split("/")[1] ?? "jpg";
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
      const fieldErrors = normalizeFieldErrors(
        error.flatten().fieldErrors
      );
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

  const pdfFile = formData.get("pdf");
  const coverFile = formData.get("cover");

  if (!(pdfFile instanceof File) || pdfFile.size === 0) {
    return jsonError(400, "PDF_REQUIRED", "PDF dosyası eksik.", {
      pdf: ["PDF dosyası eksik."]
    });
  }

  if (pdfFile.type !== PDF_CONTENT_TYPE) {
    return jsonError(
      400,
      "INVALID_PDF_TYPE",
      "PDF dosya formatı geçersiz.",
      { pdf: ["PDF dosya formatı geçersiz."] }
    );
  }

  if (pdfFile.size > MAX_PDF_SIZE) {
    return jsonError(
      400,
      "PDF_TOO_LARGE",
      `PDF dosyası ${MAX_PDF_SIZE / (1024 * 1024)}MB sınırını aşıyor.`,
      {
        pdf: [
          `PDF dosyası ${MAX_PDF_SIZE / (1024 * 1024)}MB sınırını aşıyor.`
        ]
      }
    );
  }

  if (!(coverFile instanceof File) || coverFile.size === 0) {
    return jsonError(400, "COVER_REQUIRED", "Kapak görseli eksik.", {
      cover: ["Kapak görseli eksik."]
    });
  }

  if (!ALLOWED_IMAGE_TYPES.has(coverFile.type)) {
    return jsonError(
      400,
      "INVALID_COVER_TYPE",
      "Kapak görseli sadece PNG, JPEG veya WebP olabilir.",
      {
        cover: ["Kapak görseli sadece PNG, JPEG veya WebP olabilir."]
      }
    );
  }

  if (coverFile.size > MAX_IMAGE_SIZE) {
    return jsonError(
      400,
      "COVER_TOO_LARGE",
      `Kapak görseli ${MAX_IMAGE_SIZE / (1024 * 1024)}MB sınırını aşıyor.`,
      {
        cover: [
          `Kapak görseli ${MAX_IMAGE_SIZE / (1024 * 1024)}MB sınırını aşıyor.`
        ]
      }
    );
  }

  const title = toString(formData.get("title"));
  if (!title) {
    return jsonError(400, "TITLE_REQUIRED", "Başlık gereklidir.", {
      title: ["Başlık gereklidir."]
    });
  }

  const rawSlug = toString(formData.get("slug"));
  const computedSlug = rawSlug ? slugify(rawSlug) : slugify(title);

  const submittedCategories = formData
    .getAll("categories")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const submittedTags = formData
    .getAll("tags")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const metadataInput = {
    title,
    slug: computedSlug,
    description: toString(formData.get("description")),
    difficulty: toString(formData.get("difficulty")).toUpperCase(),
    orientation: toString(formData.get("orientation")).toUpperCase(),
    ageMin: toString(formData.get("ageMin")),
    ageMax: toString(formData.get("ageMax")),
    artist: toOptionalString(formData.get("artist")),
    license: toOptionalString(formData.get("license")),
    sourceUrl: toOptionalString(formData.get("sourceUrl")),
    status: toString(formData.get("status")).toUpperCase() || "DRAFT",
    language: toString(formData.get("language")) || "tr",
    categories: submittedCategories,
    tags: submittedTags,
    width: toString(formData.get("width")),
    height: toString(formData.get("height")),
    fileSizeBytes: toString(formData.get("fileSizeBytes"))
  };

  const parsed = pageMetadataSchema.safeParse(metadataInput);
  if (!parsed.success) {
    const fieldErrors = normalizeFieldErrors(
      parsed.error.flatten().fieldErrors
    );
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Form alanlarında hatalar var.",
      fieldErrors
    );
  }

  const metadata = parsed.data;

  const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
  const coverBuffer = Buffer.from(await coverFile.arrayBuffer());

  const variants = await generateWebpVariants(coverBuffer);
  const coverExtension = getExtensionFromMimeType(coverFile.type);

  const pdfKey = `pdf/${metadata.slug}.pdf`;
  const coverKey = `cover/${metadata.slug}.${coverExtension}`;
  const thumbKeyLarge = `thumb/${metadata.slug}-800.webp`;
  const thumbKeySmall = `thumb/${metadata.slug}-400.webp`;

  const uploadedKeys: string[] = [];

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
      body: coverBuffer,
      contentType: coverFile.type,
      cacheControl: IMAGE_CACHE_CONTROL
    });
    uploadedKeys.push(coverKey);

    await uploadToR2({
      key: thumbKeySmall,
      body: variants.small,
      contentType: "image/webp",
      cacheControl: IMAGE_CACHE_CONTROL
    });
    uploadedKeys.push(thumbKeySmall);

    await uploadToR2({
      key: thumbKeyLarge,
      body: variants.large,
      contentType: "image/webp",
      cacheControl: IMAGE_CACHE_CONTROL
    });
    uploadedKeys.push(thumbKeyLarge);

    const categories = await prisma.category.findMany({
      where: { slug: { in: metadata.categories } },
      select: { id: true, slug: true }
    });

    const tags = await prisma.tag.findMany({
      where: { slug: { in: metadata.tags } },
      select: { id: true, slug: true }
    });

    const page = await prisma.coloringPage.create({
      data: {
        slug: metadata.slug,
        title: metadata.title,
        description: metadata.description,
        difficulty: metadata.difficulty,
        orientation: metadata.orientation,
        ageMin: metadata.ageMin,
        ageMax: metadata.ageMax,
        artist: metadata.artist,
        license: metadata.license,
        sourceUrl: metadata.sourceUrl,
        status: metadata.status,
        language: metadata.language,
        pdfKey,
        coverImageKey: coverKey,
        thumbWebpKey: thumbKeyLarge,
        width: variants.width ?? metadata.width,
        height: variants.height ?? metadata.height,
        fileSizeBytes: metadata.fileSizeBytes ?? getBufferSize(pdfBuffer),
        categories: {
          create: categories.map((category) => ({
            category: { connect: { id: category.id } }
          }))
        },
        tags: {
          create: tags.map((tag) => ({
            tag: { connect: { id: tag.id } }
          }))
        }
      }
    });

    revalidatePath("/");
    revalidatePath(`/sayfa/${page.slug}`);
    revalidatePath("/ara");
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
