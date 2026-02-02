import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { prisma } from "@/lib/db";
import { sanitizeSeoContent } from "@/lib/html";
import { pageMetadataSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { generateImageAssets, generatePdfFromImage, getBufferSize } from "@/lib/images";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { buildColoringPagePath } from "@/lib/page-paths";
import {
  CACHE_TAGS,
  tagForCategory,
  tagForColoringPage,
  tagForTag
} from "@/lib/cache-tags";

type SlugifyOptions = Record<string, unknown>;
type SlugifyFn = (input: string, options?: SlugifyOptions) => string;

const slugifyTr = (value: string) =>
  (slugify as unknown as SlugifyFn)(value, {
    lower: true,
    locale: "tr"
  });

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

function toRichText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

async function uploadPageAssets(
  file: File,
  slug: string,
  uploadedKeys: string[]
) {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const pdfBuffer = await generatePdfFromImage(imageBuffer);
  const assets = await generateImageAssets(imageBuffer);

  const pdfKey = `pdf/${slug}.pdf`;
  const coverKey = `cover/${slug}.webp`;
  const thumbLargeKey = `thumb/${slug}-800.webp`;
  const thumbSmallKey = `thumb/${slug}-400.webp`;

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
    key: thumbSmallKey,
    body: assets.thumbSmall,
    contentType: "image/webp",
    cacheControl: IMAGE_CACHE_CONTROL
  });
  uploadedKeys.push(thumbSmallKey);

  await uploadToR2({
    key: thumbLargeKey,
    body: assets.thumbLarge,
    contentType: "image/webp",
    cacheControl: IMAGE_CACHE_CONTROL
  });
  uploadedKeys.push(thumbLargeKey);

  return {
    pdfKey,
    coverKey,
    thumbLargeKey,
    width: assets.width,
    height: assets.height,
    fileSizeBytes: getBufferSize(pdfBuffer)
  };
}

async function isSlugTaken(slug: string, excludeId?: string) {
  const existing = await prisma.coloringPage.findFirst({
    where: {
      slug,
      NOT: excludeId ? { id: excludeId } : undefined
    },
    select: { id: true }
  });
  return Boolean(existing);
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
      tags: { include: { tag: true } },
      parent: { select: { slug: true } }
    }
  });

  if (!existingPage) {
    return jsonError(404, "PAGE_NOT_FOUND", "Sayfa bulunamadı.");
  }

  const imageFile = (formData.get("image") ?? formData.get("cover")) as
    | File
    | null;

  if (imageFile) {
    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      return jsonFieldError(
        400,
        "INVALID_IMAGE_TYPE",
        "Görsel yalnızca PNG, JPEG, SVG veya WebP formatında olabilir."
      );
    }

    if (imageFile.size > MAX_IMAGE_SIZE) {
      return jsonFieldError(
        400,
        "IMAGE_TOO_LARGE",
        `Görsel ${MAX_IMAGE_SIZE / (1024 * 1024)}MB sınırını aşıyor.`
      );
    }
  }

  const title = toString(formData.get("title")) || existingPage.title;
  const rawSlug = toString(formData.get("slug")) || existingPage.slug;
  const descriptionRaw =
    toString(formData.get("description")) || existingPage.description || "";
  const submittedCategories = collectStrings(formData.getAll("categories"));
  const submittedTags = collectStrings(formData.getAll("tags"));
  const seoContentRaw = toRichText(formData.get("seoContent"));

  const metadataInput = {
    title,
    slug: slugifyTr(rawSlug),
    categories:
      submittedCategories.length > 0
        ? submittedCategories
        : existingPage.categories.map((item) => item.category.slug),
    tags:
      submittedTags.length > 0
        ? submittedTags
        : existingPage.tags.map((item) => item.tag.slug),
    description: descriptionRaw,
    seoContent: seoContentRaw
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
  const sanitizedSeoContent = sanitizeSeoContent(metadata.seoContent);
  const normalizedSeoContent = sanitizedSeoContent.length > 0 ? sanitizedSeoContent : null;
  const slugChanged = metadata.slug !== existingPage.slug;

  if (slugChanged) {
    const taken = await isSlugTaken(metadata.slug, existingPage.id);
    if (taken) {
      return jsonFieldError(
        400,
        "SLUG_IN_USE",
        "Bu slug başka bir sayfada kullanılıyor.",
        { slug: ["Bu slug başka bir sayfada kullanılıyor."] }
      );
    }
  }

  const uploadedKeys: string[] = [];
  const keysToDelete: string[] = [];

  try {
    let assetInfo: {
      pdfKey: string;
      coverKey: string;
      thumbLargeKey: string;
      width: number;
      height: number;
      fileSizeBytes: number;
    } | null = null;

    if (imageFile instanceof File) {
      assetInfo = await uploadPageAssets(imageFile, metadata.slug, uploadedKeys);
      if (existingPage.pdfKey) keysToDelete.push(existingPage.pdfKey);
      if (existingPage.coverImageKey) keysToDelete.push(existingPage.coverImageKey);
      if (existingPage.thumbWebpKey) {
        keysToDelete.push(existingPage.thumbWebpKey);
        if (existingPage.thumbWebpKey.includes("-800.")) {
          keysToDelete.push(existingPage.thumbWebpKey.replace("-800.", "-400."));
        }
      }
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

    const updatedPage = await prisma.coloringPage.update({
      where: { id: params.id },
      data: {
        slug: metadata.slug,
        title: metadata.title,
        description: metadata.description,
        seoContent: normalizedSeoContent,
        pdfKey: assetInfo?.pdfKey ?? existingPage.pdfKey,
        coverImageKey: assetInfo?.coverKey ?? existingPage.coverImageKey,
        thumbWebpKey: assetInfo?.thumbLargeKey ?? existingPage.thumbWebpKey,
        width: assetInfo?.width ?? existingPage.width,
        height: assetInfo?.height ?? existingPage.height,
        fileSizeBytes: assetInfo?.fileSizeBytes ?? existingPage.fileSizeBytes,
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
      },
      select: {
        id: true,
        slug: true,
        parent: { select: { id: true, slug: true } }
      }
    });

    if (keysToDelete.length > 0) {
      await Promise.all(
        keysToDelete.map((key) => deleteFromR2(key).catch(() => undefined))
      );
    }

    const categorySlugs = new Set([
      ...existingPage.categories.map((entry) => entry.category.slug),
      ...metadata.categories
    ]);
    const tagSlugs = new Set([
      ...existingPage.tags.map((entry) => entry.tag.slug),
      ...metadata.tags
    ]);

    revalidatePath("/");
    revalidatePath("/ara");
    revalidatePath("/sitemap.xml");
    revalidatePath("/sitemaps/core.xml");
    revalidatePath("/sitemaps/pages.xml");
    revalidatePath("/sitemaps/images.xml");
    revalidatePath("/sitemaps/categories.xml");
    revalidatePath("/sitemaps/tags.xml");
    revalidatePath(buildColoringPagePath(updatedPage));
    if (slugChanged) {
      revalidatePath(buildColoringPagePath(existingPage));
    }
    if (updatedPage.parent?.slug) {
      revalidatePath(buildColoringPagePath({ slug: updatedPage.parent.slug, parentSlug: null }));
    }
    metadata.categories.forEach((slug) => {
      revalidatePath(`/kategori/${slug}`);
    });
    metadata.tags.forEach((slug) => {
      revalidatePath(`/etiket/${slug}`);
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${params.id}/edit`);
    if (updatedPage.parent?.id) {
      revalidatePath(`/admin/pages/${updatedPage.parent.id}/edit`);
    }

    revalidateTag(CACHE_TAGS.coloringPages);
    revalidateTag(CACHE_TAGS.categories);
    revalidateTag(CACHE_TAGS.tags);
    revalidateTag(tagForColoringPage(updatedPage.slug));
    if (slugChanged) {
      revalidateTag(tagForColoringPage(existingPage.slug));
    }
    if (updatedPage.parent?.slug) {
      revalidateTag(tagForColoringPage(updatedPage.parent.slug));
    }
    categorySlugs.forEach((slug) => {
      revalidateTag(tagForCategory(slug));
    });
    tagSlugs.forEach((slug) => {
      revalidateTag(tagForTag(slug));
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

function collectKeys(record: {
  pdfKey: string | null;
  coverImageKey: string | null;
  thumbWebpKey: string | null;
}) {
  const keys = new Set<string>();
  if (record.pdfKey) keys.add(record.pdfKey);
  if (record.coverImageKey) keys.add(record.coverImageKey);
  if (record.thumbWebpKey) {
    keys.add(record.thumbWebpKey);
    if (record.thumbWebpKey.includes("-800.")) {
      keys.add(record.thumbWebpKey.replace("-800.", "-400."));
    }
  }
  return keys;
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const page = await prisma.coloringPage.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: { select: { slug: true } } } },
      tags: { include: { tag: { select: { slug: true } } } },
      parent: { select: { id: true, slug: true } },
      children: {
        select: {
          id: true,
          slug: true,
          pdfKey: true,
          coverImageKey: true,
          thumbWebpKey: true
        }
      }
    }
  });

  if (!page) {
    return jsonError(404, "PAGE_NOT_FOUND", "Sayfa bulunamadı.");
  }

  const categorySlugs = new Set(page.categories.map((entry) => entry.category.slug));
  const tagSlugs = new Set(page.tags.map((entry) => entry.tag.slug));
  const pathsToRevalidate = new Set<string>([buildColoringPagePath(page)]);
  const pageSlugsToRevalidate = new Set<string>([page.slug]);
  if (page.parent?.slug) {
    pathsToRevalidate.add(buildColoringPagePath({ slug: page.parent.slug, parentSlug: null }));
    pageSlugsToRevalidate.add(page.parent.slug);
  }
  page.children.forEach((child) => {
    pathsToRevalidate.add(
      buildColoringPagePath({ slug: child.slug, parentSlug: page.slug })
    );
    pageSlugsToRevalidate.add(child.slug);
  });

  const keysToRemove = new Set<string>();
  collectKeys(page).forEach((key) => keysToRemove.add(key));
  page.children.forEach((child) => {
    collectKeys(child).forEach((key) => keysToRemove.add(key));
  });

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
  revalidatePath("/sitemap.xml");
  revalidatePath("/sitemaps/core.xml");
  revalidatePath("/sitemaps/pages.xml");
  revalidatePath("/sitemaps/images.xml");
  revalidatePath("/sitemaps/categories.xml");
  revalidatePath("/sitemaps/tags.xml");
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${params.id}/edit`);
  if (page.parent?.id) {
    revalidatePath(`/admin/pages/${page.parent.id}/edit`);
  }
  pathsToRevalidate.forEach((path) => {
    revalidatePath(path);
  });
  for (const slug of categorySlugs) {
    revalidatePath(`/kategori/${slug}`);
  }
  for (const slug of tagSlugs) {
    revalidatePath(`/etiket/${slug}`);
  }

  revalidateTag(CACHE_TAGS.coloringPages);
  revalidateTag(CACHE_TAGS.categories);
  revalidateTag(CACHE_TAGS.tags);
  pageSlugsToRevalidate.forEach((slug) => {
    revalidateTag(tagForColoringPage(slug));
  });
  for (const slug of categorySlugs) {
    revalidateTag(tagForCategory(slug));
  }
  for (const slug of tagSlugs) {
    revalidateTag(tagForTag(slug));
  }

  return NextResponse.json({ success: true });
}
