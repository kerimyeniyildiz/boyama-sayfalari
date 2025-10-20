import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PageStatus } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { pageMetadataSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { generateImageAssets, generatePdfFromImage, getBufferSize } from "@/lib/images";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { generateImageBuffer, generateImageName } from "@/lib/ai/replicate";

const slugifyTr = (value: string) =>
  (slugify as unknown as (input: string, options?: any) => string)(value, {
    lower: true,
    locale: "tr"
  });
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

function toRichText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
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

async function createFilesFromPrompts(prompts: string[]): Promise<File[]> {
  const files: File[] = [];
  const usedSlugs = new Set<string>();

  for (let index = 0; index < prompts.length; index += 1) {
    const originalPrompt = prompts[index];
    const namingPrompt = `${originalPrompt} << Bu bir görsel üretme promptu. Üretilen görsele üretme promptuna uygun noktalama işareti kullanmadan Türkçe kısa bir isim ver.`;

    let rawName: string;
    try {
      rawName = await generateImageName(namingPrompt);
    } catch (error) {
      throw new Error(`Görsel adı üretilemedi (satır ${index + 1}): ${(error as Error).message}`);
    }

    const normalizedName = rawName
      .replace(/[\r\n\t]/g, " ")
      .replace(/["'`]/g, "")
      .trim();

    const fallbackName = `gorsel-${index + 1}`;
    const slugBase = slugify(normalizedName.length > 0 ? normalizedName : fallbackName) || slugify(fallbackName);

    let uniqueSlug = slugBase;
    let counter = 2;
    while (usedSlugs.has(uniqueSlug)) {
      uniqueSlug = `${slugBase}-${counter}`;
      counter += 1;
    }
    usedSlugs.add(uniqueSlug);

    let imageBuffer: Buffer;
    try {
      const result = await generateImageBuffer(originalPrompt);
      imageBuffer = result.buffer;
    } catch (error) {
      throw new Error(`Görsel üretimi başarısız oldu (satır ${index + 1}): ${(error as Error).message}`);
    }

    const arrayBuffer = imageBuffer.buffer.slice(
      imageBuffer.byteOffset,
      imageBuffer.byteOffset + imageBuffer.byteLength
    ) as ArrayBuffer;
    const fileData = new Uint8Array(arrayBuffer);
    const file = new File([fileData], `${uniqueSlug}.jpg`, { type: "image/jpeg" });
    files.push(file);
  }

  return files;
}


async function ensureUniqueSlug(baseSlug: string, used: Set<string>) {
  let candidate = baseSlug.length > 0 ? baseSlug : slugifyTr(Date.now().toString());
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
    candidate = slugifyTr(`${baseSlug}-${counter}`);
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
  const promptFile = formData.get("promptFile");
  const hasPromptFile = promptFile instanceof File && promptFile.size > 0;

  let primaryImage: File | null =
    rawImage instanceof File && rawImage.size > 0 ? rawImage : null;
  let additionalImages: File[] = extraImages;

  if (hasPromptFile) {
    const promptText = await promptFile.text();
    const promptLines = promptText
      .split(/[\r\n]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (promptLines.length === 0) {
      return jsonError(
        400,
        "PROMPT_FILE_EMPTY",
        "TXT dosyası boş görünüyor.",
        {
          promptFile: ["TXT dosyası en az bir satır içermelidir."]
        }
      );
    }

    let generatedFiles: File[];
    try {
      generatedFiles = await createFilesFromPrompts(promptLines);
    } catch (error) {
      return jsonError(
        500,
        "PROMPT_IMAGE_GENERATION_FAILED",
        (error as Error).message
      );
    }

    primaryImage = generatedFiles[0] ?? null;
    additionalImages = generatedFiles.slice(1);
  }

  if (!primaryImage) {
    return jsonError(400, "IMAGE_REQUIRED", "Görsel yüklenmedi.", {
      image: ["TXT dosyası sağlamadıysanız en az bir görsel yüklemelisiniz."]
    });
  }

  const allImages = [primaryImage, ...additionalImages];

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
  const seoContentRaw = toRichText(formData.get("seoContent"));

  const metadataInput = {
    title,
    slug: rawSlug ? slugifyTr(rawSlug) : slugifyTr(title),
    categories: submittedCategories,
    tags: submittedTags,
    seoContent: seoContentRaw
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
  const normalizedSeoContent =
    typeof metadata.seoContent === "string" && metadata.seoContent.trim().length > 0
      ? metadata.seoContent.trim()
      : null;

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

  const uploadedKeys: string[] = [];
  const createdSlugs: string[] = [];
  const usedSlugs = new Set<string>();

  try {
    const parentSlug = await ensureUniqueSlug(metadata.slug, usedSlugs);
    const parentAssets = await uploadPageAssets(primaryImage, parentSlug, uploadedKeys);

    const parentPage = await prisma.coloringPage.create({
      data: {
        slug: parentSlug,
        title: metadata.title,
        description: `${metadata.title} boyama sayfası.`,
        seoContent: normalizedSeoContent,
        orientation: "PORTRAIT",
        status: PageStatus.PUBLISHED,
        language: "tr",
        pdfKey: parentAssets.pdfKey,
        coverImageKey: parentAssets.coverKey,
        thumbWebpKey: parentAssets.thumbLargeKey,
        width: parentAssets.width,
        height: parentAssets.height,
        fileSizeBytes: parentAssets.fileSizeBytes,
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

    createdSlugs.push(parentSlug);

    for (const file of additionalImages) {
      const baseSlug = deriveSlugFromFile(file);
      const slug = await ensureUniqueSlug(baseSlug, usedSlugs);
      const titleFromSlug = humanizeSlug(slug);
      const childAssets = await uploadPageAssets(file, slug, uploadedKeys);

      await prisma.coloringPage.create({
        data: {
          slug,
          title: titleFromSlug,
          description: `${titleFromSlug} boyama sayfası.`,
          seoContent: null,
          orientation: "PORTRAIT",
          status: PageStatus.PUBLISHED,
          language: "tr",
          pdfKey: childAssets.pdfKey,
          coverImageKey: childAssets.coverKey,
          thumbWebpKey: childAssets.thumbLargeKey,
          width: childAssets.width,
          height: childAssets.height,
          fileSizeBytes: childAssets.fileSizeBytes,
          parent: { connect: { id: parentPage.id } },
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

      createdSlugs.push(slug);
    }

    revalidatePath("/");
    revalidatePath("/ara");
    revalidatePath("/admin/pages");
    revalidatePath(`/${parentSlug}`);
    createdSlugs.slice(1).forEach((slug) => {
      revalidatePath(`/${slug}`);
    });
    metadata.categories.forEach((slug) => {
      revalidatePath(`/kategori/${slug}`);
    });
    metadata.tags.forEach((slug) => {
      revalidatePath(`/etiket/${slug}`);
    });

    return NextResponse.json({ success: true, slug: parentSlug });
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
