import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { pageMetadataSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { generateImageAssets, generatePdfFromImage, getBufferSize } from "@/lib/images";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";

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

function jsonError(status: number, code: string, message: string) {
  const body: ErrorResponse = {
    error: {
      code,
      message
    }
  };

  return NextResponse.json(body, { status });
}

function jsonFieldError(
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

function collectStrings(values: FormDataEntryValue[]): string[] {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function toString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const formData = await request.formData();
  const existingPage = await prisma.coloringPage.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } }
    }
  });

  if (!existingPage) {
    return jsonError(404, "PAGE_NOT_FOUND", "Sayfa bulunamadı.");
  }

  const imageFile = (formData.get("image") ?? formData.get("cover")) as
    | File
    | null;

  const title = toString(formData.get("title")) || existingPage.title;
  const rawSlug = toString(formData.get("slug"));
  const submittedCategories = collectStrings(formData.getAll("categories"));
  const submittedTags = collectStrings(formData.getAll("tags"));

  const metadataInput = {
    title,
    slug: rawSlug ? slugify(rawSlug) : existingPage.slug,
    categories:
      submittedCategories.length > 0
        ? submittedCategories
        : existingPage.categories.map((item) => item.category.slug),
    tags:
      submittedTags.length > 0
        ? submittedTags
        : existingPage.tags.map((item) => item.tag.slug)
  };

  const parsed = pageMetadataSchema.safeParse(metadataInput);
  if (!parsed.success) {
    return jsonFieldError(
      400,
      "VALIDATION_ERROR",
      "Form alanlarında hatalar var.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const metadata = parsed.data;
  const slugChanged = metadata.slug !== existingPage.slug;

  if (slugChanged && !(imageFile instanceof File && imageFile.size > 0)) {
    return jsonFieldError(
      400,
      "IMAGE_REQUIRED_FOR_SLUG_CHANGE",
      "Slug değiştirildiğinde görselin yeniden yüklenmesi gerekir.",
      {
        image: ["Slug değiştirildiğinde görselin yeniden yüklenmesi gerekir."]
      }
    );
  }

  let newPdfBuffer: Buffer | null = null;
  let newAssets: Awaited<ReturnType<typeof generateImageAssets>> | null = null;

  if (imageFile instanceof File && imageFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      return jsonFieldError(
        400,
        "INVALID_IMAGE_TYPE",
        "Görsel yalnızca PNG, JPEG, SVG veya WebP formatında olabilir.",
        {
          image: ["Görsel yalnızca PNG, JPEG, SVG veya WebP formatında olabilir."]
        }
      );
    }

    if (imageFile.size > MAX_IMAGE_SIZE) {
      return jsonFieldError(
        400,
        "IMAGE_TOO_LARGE",
        `Görsel ${MAX_IMAGE_SIZE / (1024 * 1024)}MB sınırını aşıyor.`,
        {
          image: [`Görsel ${MAX_IMAGE_SIZE / (1024 * 1024)}MB sınırını aşıyor.`]
        }
      );
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    newPdfBuffer = await generatePdfFromImage(imageBuffer);
    newAssets = await generateImageAssets(imageBuffer);
  }

  const pdfKey = newPdfBuffer
    ? `pdf/${metadata.slug}.pdf`
    : existingPage.pdfKey;
  const coverKey = newPdfBuffer
    ? `cover/${metadata.slug}.webp`
    : existingPage.coverImageKey;
  const thumbKeyLarge = newPdfBuffer
    ? `thumb/${metadata.slug}-800.webp`
    : existingPage.thumbWebpKey;
  const thumbKeySmall = newPdfBuffer
    ? `thumb/${metadata.slug}-400.webp`
    : existingPage.thumbWebpKey.replace("-800.webp", "-400.webp");

  const uploadedKeys: string[] = [];
  const keysToDelete: string[] = [];

  if (newPdfBuffer && newAssets) {
    keysToDelete.push(
      existingPage.pdfKey,
      existingPage.coverImageKey,
      existingPage.thumbWebpKey,
      existingPage.thumbWebpKey.replace("-800.webp", "-400.webp")
    );

    await uploadToR2({
      key: pdfKey,
      body: newPdfBuffer,
      contentType: "application/pdf",
      cacheControl: PDF_CACHE_CONTROL
    });
    uploadedKeys.push(pdfKey);

    await uploadToR2({
      key: coverKey,
      body: newAssets.cover,
      contentType: "image/webp",
      cacheControl: IMAGE_CACHE_CONTROL
    });
    uploadedKeys.push(coverKey);

    await uploadToR2({
      key: thumbKeySmall,
      body: newAssets.thumbSmall,
      contentType: "image/webp",
      cacheControl: IMAGE_CACHE_CONTROL
    });
    uploadedKeys.push(thumbKeySmall);

    await uploadToR2({
      key: thumbKeyLarge,
      body: newAssets.thumbLarge,
      contentType: "image/webp",
      cacheControl: IMAGE_CACHE_CONTROL
    });
    uploadedKeys.push(thumbKeyLarge);
  }

  try {
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

    const updatedPage = await prisma.coloringPage.update({
      where: { id: params.id },
      data: {
        slug: metadata.slug,
        title: metadata.title,
        description: `${metadata.title} boyama sayfası.`,
        orientation: "PORTRAIT",
        pdfKey,
        coverImageKey: coverKey,
        thumbWebpKey: thumbKeyLarge,
        width: newAssets?.width ?? existingPage.width,
        height: newAssets?.height ?? existingPage.height,
        fileSizeBytes:
          newPdfBuffer !== null
            ? getBufferSize(newPdfBuffer)
            : existingPage.fileSizeBytes,
        categories: {
          deleteMany: {},
          create: categories.map((category) => ({
            category: { connect: { id: category.id } }
          }))
        },
        tags: {
          deleteMany: {},
          create: tags.map((tag) => ({
            tag: { connect: { id: tag.id } }
          }))
        }
      }
    });

    if (keysToDelete.length > 0) {
      await Promise.all(
        keysToDelete.map((key) => deleteFromR2(key).catch(() => undefined))
      );
    }

    revalidatePath("/");
    revalidatePath("/ara");
    revalidatePath(`/sayfa/${updatedPage.slug}`);
    if (slugChanged) {
      revalidatePath(`/sayfa/${existingPage.slug}`);
    }
    revalidatePath("/admin/pages");
    metadata.categories.forEach((slug) => {
      revalidatePath(`/kategori/${slug}`);
    });
    metadata.tags.forEach((slug) => {
      revalidatePath(`/etiket/${slug}`);
    });

    return NextResponse.json({ success: true, page: updatedPage });
  } catch (error) {
    await Promise.all(
      uploadedKeys.map((key) => deleteFromR2(key).catch(() => undefined))
    );
    console.error("Sayfa güncellenemedi", error);
    return jsonError(
      500,
      "PAGE_UPDATE_FAILED",
      "Sayfa güncellenirken bir hata oluştu."
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const page = await prisma.coloringPage.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: { select: { slug: true } } } },
      tags: { include: { tag: { select: { slug: true } } } }
    }
  });

  if (!page) {
    return jsonError(404, "PAGE_NOT_FOUND", "Sayfa bulunamadı.");
  }

  const categorySlugs = new Set(page.categories.map((entry) => entry.category.slug));
  const tagSlugs = new Set(page.tags.map((entry) => entry.tag.slug));

  const keysToRemove = new Set<string>();
  if (page.pdfKey) {
    keysToRemove.add(page.pdfKey);
  }
  if (page.coverImageKey) {
    keysToRemove.add(page.coverImageKey);
  }
  if (page.thumbWebpKey) {
    keysToRemove.add(page.thumbWebpKey);
    if (page.thumbWebpKey.includes("-800.")) {
      keysToRemove.add(page.thumbWebpKey.replace("-800.", "-400."));
    }
  }

  try {
    await prisma.coloringPage.delete({
      where: { id: params.id }
    });
  } catch (error) {
    console.error("Sayfa silinemedi", error);
    return jsonError(
      500,
      "PAGE_DELETE_FAILED",
      "Sayfa silinirken bir hata oluştu."
    );
  }

  if (keysToRemove.size > 0) {
    await Promise.all(
      Array.from(keysToRemove).map((key) =>
        deleteFromR2(key).catch(() => undefined)
      )
    );
  }

  revalidatePath("/");
  revalidatePath("/ara");
  revalidatePath(`/sayfa/${page.slug}`);
  revalidatePath("/admin/pages");
  for (const slug of categorySlugs) {
    revalidatePath(`/kategori/${slug}`);
  }
  for (const slug of tagSlugs) {
    revalidatePath(`/etiket/${slug}`);
  }

  return NextResponse.json({ success: true });
}


