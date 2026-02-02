import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { PageStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import {
  generateImageAssets,
  generatePdfFromImage,
  getBufferSize
} from "@/lib/images";
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

function deriveSlugFromFile(file: File) {
  const withoutExtension = file.name.replace(/\.[^/.]+$/, "");
  const normalized = withoutExtension
    .replace(/[_\s]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, (_match, part1: string, part2: string) => `${part1} ${part2}`)
    .trim();
  const lowered = normalized.replace(/[A-Z]/g, (character) =>
    character.toLowerCase()
  );
  return slugifyTr(lowered);
}

function humanizeSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => {
      if (word.length === 0) {
        return word;
      }
      const first = word[0].toLocaleUpperCase("tr-TR");
      const rest = word.slice(1).toLocaleLowerCase("tr-TR");
      return `${first}${rest}`;
    })
    .join(" ");
}

async function ensureUniqueSlug(baseSlug: string, used: Set<string>) {
  const initial = baseSlug.length > 0 ? baseSlug : slugifyTr(Date.now().toString());
  let candidate = initial;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!used.has(candidate)) {
      const existing = await prisma.coloringPage.findUnique({
        where: { slug: candidate },
        select: { id: true }
      });
      if (!existing) {
        used.add(candidate);
        return candidate;
      }
    }
    candidate = slugifyTr(`${initial}-${counter}`);
    counter += 1;
  }
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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const parent = await prisma.coloringPage.findUnique({
    where: { id: params.id },
    include: {
      categories: {
        select: {
          category: {
            select: {
              id: true,
              slug: true
            }
          }
        }
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              slug: true
            }
          }
        }
      }
    }
  });

  if (!parent) {
    return jsonError(404, "PARENT_NOT_FOUND", "Ana sayfa bulunamadı.");
  }

  if (parent.parentId) {
    return jsonError(
      400,
      "NOT_MAIN_PAGE",
      "Alt sayfalara yalnızca ana sayfa üzerinden yeni görseller eklenebilir."
    );
  }

  const formData = await request.formData();
  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (imageFiles.length === 0) {
    return jsonError(
      400,
      "NO_IMAGES",
      "Lütfen en az bir görsel seçin."
    );
  }

  for (const file of imageFiles) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return jsonError(
        400,
        "INVALID_IMAGE_TYPE",
        "Görseller yalnızca PNG, JPEG, SVG veya WebP formatında olabilir."
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return jsonError(
        400,
        "IMAGE_TOO_LARGE",
        `Her görsel en fazla ${MAX_IMAGE_SIZE / (1024 * 1024)}MB olabilir.`
      );
    }
  }

  const uploadedKeys: string[] = [];
  const usedSlugs = new Set<string>([parent.slug]);
  const createdPages: Array<{ slug: string; parentSlug: string }> = [];

  try {
    for (const file of imageFiles) {
      const baseSlug = deriveSlugFromFile(file);
      const slug = await ensureUniqueSlug(baseSlug, usedSlugs);
      const titleFromSlug = humanizeSlug(slug);
      const assets = await uploadPageAssets(file, slug, uploadedKeys);

      await prisma.coloringPage.create({
        data: {
          slug,
          title: titleFromSlug,
          description: `${titleFromSlug} boyama sayfası.`,
          orientation: parent.orientation,
          status: PageStatus.PUBLISHED,
          language: parent.language,
          pdfKey: assets.pdfKey,
          coverImageKey: assets.coverKey,
          thumbWebpKey: assets.thumbLargeKey,
          width: assets.width,
          height: assets.height,
          fileSizeBytes: assets.fileSizeBytes,
          parent: { connect: { id: parent.id } },
          categories: {
            create: parent.categories.map((relation) => ({
              category: { connect: { id: relation.category.id } }
            }))
          },
          tags: {
            create: parent.tags.map((relation) => ({
              tag: { connect: { id: relation.tag.id } }
            }))
          }
        }
      });

      createdPages.push({ slug, parentSlug: parent.slug });
    }
  } catch (error) {
    await Promise.all(
      uploadedKeys.map((key) => deleteFromR2(key).catch(() => undefined))
    );
    console.error("Alt sayfa eklenemedi", error);
    return jsonError(
      500,
      "CHILD_CREATE_FAILED",
      "Alt sayfa eklenirken bir hata oluştu."
    );
  }

  revalidatePath("/");
  revalidatePath("/ara");
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${parent.id}/edit`);
  revalidatePath(buildColoringPagePath({ slug: parent.slug, parentSlug: null }));
  createdPages.forEach((entry) => {
    revalidatePath(buildColoringPagePath(entry));
  });
  const categorySlugs = new Set(parent.categories.map((entry) => entry.category.slug));
  const tagSlugs = new Set(parent.tags.map((entry) => entry.tag.slug));
  categorySlugs.forEach((slug) => revalidatePath(`/kategori/${slug}`));
  tagSlugs.forEach((slug) => revalidatePath(`/etiket/${slug}`));

  revalidateTag(CACHE_TAGS.coloringPages);
  revalidateTag(CACHE_TAGS.categories);
  revalidateTag(CACHE_TAGS.tags);
  revalidateTag(tagForColoringPage(parent.slug));
  createdPages.forEach((entry) => {
    revalidateTag(tagForColoringPage(entry.slug));
  });
  categorySlugs.forEach((slug) => {
    revalidateTag(tagForCategory(slug));
  });
  tagSlugs.forEach((slug) => {
    revalidateTag(tagForTag(slug));
  });

  return NextResponse.json({ success: true, created: createdPages.length });
}
