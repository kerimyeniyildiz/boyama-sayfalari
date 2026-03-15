import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { sanitizeSeoContent } from "@/lib/html";
import { pageMetadataSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { generateImageAssets, generatePdfFromImage, getBufferSize } from "@/lib/images";
import { detectImageMimeTypeFromBuffer } from "@/lib/image-sniff";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import {
  generateImageBuffer,
  generateImageName,
  generateTextWithReplicate
} from "@/lib/ai/replicate";
import { buildColoringPagePath } from "@/lib/page-paths";
import { resolvePublicationState } from "@/lib/publishing";
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

type ImageSource = {
  name: string;
  buffer: Buffer;
  mimeType: string;
  mimeTrusted: boolean;
  label: string;
  slugHint: string;
};

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

function coerceStatus(value: string): "DRAFT" | "PUBLISHED" {
  return value.trim().toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parsePromptLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function createAssetVersion() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeGeneratedParagraph(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[<>{}[\]]/g, "")
    .trim();
}

function normalizeWhitespace(value: string) {
  // Türkçe karakterleri koruyarak whitespace normalizasyonu yap
  return value
    .normalize("NFC")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCaseTr(value: string) {
  if (value.length === 0) {
    return value;
  }
  return value
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => {
      const [first = "", ...rest] = Array.from(word);
      if (first.length === 0) {
        return "";
      }
      const restJoined = rest.join("");
      return `${first.toLocaleUpperCase("tr-TR")}${restJoined.toLocaleLowerCase("tr-TR")}`;
    })
    .join(" ");
}

function deriveLabelFromPrompt(prompt: string) {
  const normalized = normalizeWhitespace(
    prompt
      .replace(/[`"']/g, " ")
      .replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü\s-]/g, " ")
  );
  const tokens = normalized
    .split(" ")
    .filter((token) => token.length > 1)
    .slice(0, 5);

  if (tokens.length === 0) {
    return "Boyama Sayfası";
  }

  return toTitleCaseTr(tokens.join(" "));
}

function sanitizeAiGeneratedLabel(raw: string) {
  const normalized = normalizeWhitespace(
    raw
      .replace(/[`"']/g, " ")
      .replace(/\\[a-z]/gi, " ")
      .replace(/[\[\]{}()<>]/g, " ")
      .replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü\s-]/g, " ")
  );
  const lowered = normalized.toLocaleLowerCase("tr-TR");
  const looksLikeToolDump =
    /action|action_input|thought|prompt|text2im|dalle|json|kullanicinin|istedigi|tarzinda/.test(
      lowered
    );

  if (looksLikeToolDump) {
    return "";
  }

  const compact = normalized.split(" ").filter((part) => part.length > 0).slice(0, 6).join(" ");
  return toTitleCaseTr(compact);
}

function buildTopicFromAnchor(anchor: string) {
  return toTitleCaseTr(normalizeWhitespace(anchor));
}

function hasWordCharacters(value: string) {
  return /\p{L}/u.test(value);
}

function normalizeForComparison(value: string) {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9çğıöşü]/g, "");
}

function buildLabelAndSlugHint(rawName: string, fallback: string) {
  const cleanedRaw = sanitizeAiGeneratedLabel(rawName);
  const cleanedFallback = deriveLabelFromPrompt(fallback);

  let baseSource = cleanedRaw;
  if (!hasWordCharacters(baseSource)) {
    baseSource = cleanedFallback;
  }
  if (!hasWordCharacters(baseSource)) {
    baseSource = "Boyama Sayfası";
  }

  return {
    label: toTitleCaseTr(baseSource),
    slugHint: baseSource
  };
}

function deriveSlugFromSource(source: ImageSource) {
  const base = source.slugHint && source.slugHint.length > 0 ? source.slugHint : source.name;
  const withoutExtension = base.replace(/\.[^/.]+$/, "");
  const normalized = normalizeWhitespace(withoutExtension);
  const slug = slugifyTr(normalized);
  if (slug.length > 0) {
    return slug;
  }
  return slugifyTr("gorsel");
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

async function createSourcesFromPrompts(prompts: string[]): Promise<ImageSource[]> {
  const sources: ImageSource[] = [];
  const usedNames = new Set<string>();

  for (let index = 0; index < prompts.length; index += 1) {
    const originalPrompt = prompts[index];
    const namingPrompt = `${originalPrompt} << Bu bir görsel üretme promptu. Üretilen görsele üretme promptuna uygun noktalama işareti kullanmadan Türkçe kısa bir isim ver.`;

    let rawName: string;
    try {
      rawName = await generateImageName(namingPrompt);
    } catch (error) {
      throw new Error(`Görsel adı üretilemedi (satır ${index + 1}): ${(error as Error).message}`);
    }

    const fallbackName = `gorsel-${index + 1}`;
    const promptFallback = hasWordCharacters(originalPrompt)
      ? originalPrompt
      : fallbackName;
    const labelInfo = buildLabelAndSlugHint(rawName, promptFallback);
    const label = labelInfo.label.trim();
    const slugHint = labelInfo.slugHint.trim();
    const baseName = label.length > 0 ? label : fallbackName;
    let uniqueName = baseName;
    let counter = 2;
    while (usedNames.has(uniqueName)) {
      uniqueName = `${baseName}-${counter}`;
      counter += 1;
    }
    usedNames.add(uniqueName);

    let imageBuffer: Buffer;
    try {
      const result = await generateImageBuffer(originalPrompt);
      imageBuffer = result.buffer;
    } catch (error) {
      throw new Error(`Görsel üretimi başarısız oldu (satır ${index + 1}): ${(error as Error).message}`);
    }

    const detectedMimeType = detectImageMimeTypeFromBuffer(imageBuffer);

    sources.push({
      name: `${uniqueName}.jpg`,
      buffer: imageBuffer,
      mimeType: detectedMimeType ?? "application/octet-stream",
      mimeTrusted: detectedMimeType !== null,
      label: label.length > 0 ? label : toTitleCaseTr(fallbackName),
      slugHint: slugHint.length > 0 ? slugHint : fallbackName
    });
  }

  return sources;
}

async function generateAutoMetaDescription(topic: string, pageCount: number) {
  const prompt = `Write an SEO-optimized meta description in Turkish for a coloring pages website category.

Topic: ${topic}
Total pages: ${pageCount}

Rules:
- 140-160 characters
- Mention that the coloring pages are free
- Mention PDF download
- Mention printing (yazdır)
- Encourage users to click
- Use natural Turkish but include the keyword "${topic} boyama sayfaları"

SEO phrases to include naturally:
- "${topic} boyama sayfaları"
- "PDF indir"
- "yazdır"
- "ücretsiz"

Output only the meta description sentence.`;

  const generated = await generateTextWithReplicate(prompt);
  return generated;
}

async function generateAutoSeoParagraph(topic: string) {
  const prompt = `Write ONE SEO-focused paragraph in Turkish for a coloring pages website category.

Topic: ${topic}

Requirements:
- Only ONE paragraph
- Encourage users to download and print
- Mention that the coloring pages are available as PDF
- Target children, parents, and teachers
- Use simple Turkish

SEO requirements:
- Repeat the keyword "${topic} boyama sayfaları" multiple times naturally
- Also include these phrases:
  - "${topic} boyama sayfaları PDF"
  - "${topic} boyama sayfaları indir"
  - "${topic} boyama sayfaları yazdır"
  - "çocuklar için ${topic} boyama sayfaları"

The paragraph should be SEO-optimized and include light keyword repetition but still read naturally.

Output only the paragraph.`;

  const generated = normalizeGeneratedParagraph(await generateTextWithReplicate(prompt));
  if (generated.length > 0) {
    return generated;
  }
  throw new Error(`${topic} için SEO metni üretilemedi.`);
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
  source: ImageSource,
  slug: string,
  uploadedKeys: string[]
) {
  const assetVersion = createAssetVersion();
  const imageBuffer = source.buffer;
  const pdfBuffer = await generatePdfFromImage(imageBuffer);
  const assets = await generateImageAssets(imageBuffer);

  const pdfKey = `pdf/${slug}-${assetVersion}.pdf`;
  const coverKey = `cover/${slug}-${assetVersion}.webp`;
  const thumbLargeKey = `thumb/${slug}-${assetVersion}-800.webp`;
  const thumbSmallKey = `thumb/${slug}-${assetVersion}-400.webp`;

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

  const rawImageFile = (formData.get("image") ?? formData.get("cover")) as
    | File
    | null;
  const extraImageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const promptLinesRaw = toString(formData.get("promptLines"));
  const promptLinesFromForm = parsePromptLines(promptLinesRaw);
  const hasPromptLines = promptLinesFromForm.length > 0;

  const convertFileToSource = async (file: File, fallbackName: string): Promise<ImageSource> => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedMimeType = detectImageMimeTypeFromBuffer(buffer);
    const name = file.name && file.name.trim().length > 0 ? file.name : fallbackName;
    const mimeType =
      detectedMimeType ??
      (file.type && file.type.trim().length > 0 ? file.type : "application/octet-stream");
    const withoutExtension = name.replace(/\.[^/.]+$/, "");
    const fallbackBase = fallbackName.replace(/\.[^/.]+$/, "");
    const labelInfo = buildLabelAndSlugHint(withoutExtension, fallbackBase);
    const label = labelInfo.label.trim();
    const slugHint = labelInfo.slugHint.trim();
    return {
      name,
      buffer,
      mimeType,
      mimeTrusted: detectedMimeType !== null,
      label: label.length > 0 ? label : fallbackBase,
      slugHint: slugHint.length > 0 ? slugHint : fallbackBase
    };
  };

  const sources: ImageSource[] = [];
  let promptLines: string[] = [];

  if (rawImageFile instanceof File && rawImageFile.size > 0 && !hasPromptLines) {
    sources.push(await convertFileToSource(rawImageFile, "ana-gorsel.jpg"));
  }

  if (!hasPromptLines && extraImageFiles.length > 0) {
    const extraSources = await Promise.all(
      extraImageFiles.map((file, index) =>
        convertFileToSource(file, `ek-gorsel-${index + 1}.jpg`)
      )
    );
    sources.push(...extraSources);
  }

  if (hasPromptLines) {
    promptLines = promptLinesFromForm;

    let generatedSources: ImageSource[];
    try {
      generatedSources = await createSourcesFromPrompts(promptLinesFromForm);
    } catch (error) {
      return jsonError(
        500,
        "PROMPT_IMAGE_GENERATION_FAILED",
        (error as Error).message
      );
    }

    sources.push(...generatedSources);
  }

  if (sources.length === 0) {
    return jsonError(400, "PROMPTS_REQUIRED", "En az bir görsel promptu girilmelidir.", {
      promptLines: ["Her satıra bir görsel promptu girin."]
    });
  }

  const [primaryImage, ...additionalImages] = sources;

  for (const image of sources) {
    if (!image.mimeTrusted || !ALLOWED_IMAGE_TYPES.has(image.mimeType)) {
      return jsonError(
        400,
        "INVALID_IMAGE_TYPE",
        "Görsel yalnızca PNG, JPEG, SVG veya WebP formatında olabilir.",
        {
          image: ["Görsel yalnızca PNG, JPEG, SVG veya WebP formatında olabilir."]
        }
      );
    }

    if (image.buffer.byteLength > MAX_IMAGE_SIZE) {
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
  let descriptionRaw = toString(formData.get("description"));
  const submittedCategories = collectStrings(formData.getAll("categories"));
  const submittedTags = collectStrings(formData.getAll("tags"));
  let seoContentRaw = toRichText(formData.get("seoContent"));
  const statusRaw = toString(formData.get("status"));
  const publishAtRaw = toString(formData.get("publishAt"));
  const anchorRaw = toString(formData.get("anchor"));
  const requestedPageCountRaw = toString(formData.get("pageCount"));
  const requestedPageCount = Number.parseInt(requestedPageCountRaw, 10);
  const pageCount =
    Number.isFinite(requestedPageCount) && requestedPageCount >= 60 && requestedPageCount <= 120
      ? requestedPageCount
      : randomInt(60, 120);

  const publicationState = resolvePublicationState({
    requestedStatus: coerceStatus(statusRaw),
    publishAtRaw
  });
  if (!publicationState.ok) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      publicationState.message,
      publicationState.fieldErrors
    );
  }

  const trimmedTitle = title.trim();
  const trimmedSlugInput = rawSlug.trim();
  const fallbackTitle = primaryImage.label?.trim() ?? "";
  const fallbackSlug = deriveSlugFromSource(primaryImage);
  const normalizedTitleKey = trimmedTitle.length > 0 ? normalizeForComparison(trimmedTitle) : "";
  const normalizedFirstPrompt =
    hasPromptLines && promptLines.length > 0
      ? normalizeForComparison(promptLines[0])
      : "";

  const anchorTopic = anchorRaw.length > 0 ? buildTopicFromAnchor(anchorRaw) : "";
  const hasAnchor = anchorTopic.length > 0;

  if (hasAnchor) {
    try {
      descriptionRaw = await generateAutoMetaDescription(anchorTopic, pageCount);
      seoContentRaw = await generateAutoSeoParagraph(anchorTopic);
    } catch (error) {
      return jsonError(
        500,
        "AUTO_TEXT_GENERATION_FAILED",
        `SEO içerikleri üretilemedi: ${(error as Error).message}`
      );
    }
  }

  let effectiveTitle = trimmedTitle;
  if (hasAnchor) {
    effectiveTitle = `${anchorTopic} Boyama Sayfaları | ${pageCount}+ Ücretsiz PDF`;
  } else {
    if (
      hasPromptLines &&
      fallbackTitle.length >= 3 &&
      (effectiveTitle.length < 3 ||
        (normalizedFirstPrompt.length > 0 &&
          normalizedTitleKey === normalizedFirstPrompt))
    ) {
      effectiveTitle = fallbackTitle;
    }

    if (effectiveTitle.length < 3 && fallbackTitle.length >= 3) {
      effectiveTitle = fallbackTitle;
    }

    if (effectiveTitle.length < 3 && fallbackSlug.length > 0) {
      effectiveTitle = humanizeSlug(fallbackSlug);
    }

    if (effectiveTitle.length < 3) {
      effectiveTitle = "Boyama Sayfası";
    }
  }

  const generatedAnchorSlugBase = hasAnchor ? slugifyTr(anchorTopic) : "";
  const generatedAnchorSlug =
    hasAnchor && generatedAnchorSlugBase.length > 0
      ? generatedAnchorSlugBase.endsWith("-boyama")
        ? generatedAnchorSlugBase
        : `${generatedAnchorSlugBase}-boyama`
      : "";

  const slugSource = generatedAnchorSlug || (trimmedSlugInput.length > 0 ? trimmedSlugInput : effectiveTitle);
  let effectiveSlug = slugifyTr(slugSource);
  if (!effectiveSlug && fallbackSlug.length > 0) {
    effectiveSlug = fallbackSlug;
  }
  if (!effectiveSlug) {
    effectiveSlug = slugifyTr(Date.now().toString());
  }

  const metadataInput = {
    title: effectiveTitle,
    slug: effectiveSlug,
    description: descriptionRaw,
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
  const sanitizedSeoContent = sanitizeSeoContent(metadata.seoContent);
  const normalizedSeoContent = sanitizedSeoContent.length > 0 ? sanitizedSeoContent : null;

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
  const createdPages: Array<{ slug: string; parentSlug?: string | null }> = [];
  const usedSlugs = new Set<string>();

  try {
    const parentSlug = await ensureUniqueSlug(metadata.slug, usedSlugs);
    const parentAssets = await uploadPageAssets(primaryImage, parentSlug, uploadedKeys);

    const parentPage = await prisma.coloringPage.create({
      data: {
        slug: parentSlug,
        title: metadata.title,
        description: metadata.description,
        seoContent: normalizedSeoContent,
        orientation: "PORTRAIT",
        status: publicationState.status,
        publishAt: publicationState.publishAt,
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

    createdPages.push({ slug: parentSlug, parentSlug: null });

    for (const imageSource of additionalImages) {
      const baseSlug = deriveSlugFromSource(imageSource);
      const slug = await ensureUniqueSlug(baseSlug, usedSlugs);
      const computedTitle =
        imageSource.label && imageSource.label.length > 0
          ? imageSource.label
          : humanizeSlug(slug);
      const childAssets = await uploadPageAssets(imageSource, slug, uploadedKeys);

      await prisma.coloringPage.create({
        data: {
          slug,
          title: computedTitle,
          description: `${computedTitle} boyama sayfası.`,
          seoContent: null,
          orientation: "PORTRAIT",
          status: publicationState.status,
          publishAt: publicationState.publishAt,
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

      createdPages.push({ slug, parentSlug });
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
    createdPages.forEach((entry) => {
      revalidatePath(buildColoringPagePath(entry));
    });
    metadata.categories.forEach((slug) => {
      revalidatePath(`/kategori/${slug}`);
    });
    metadata.tags.forEach((slug) => {
      revalidatePath(`/etiket/${slug}`);
    });

    revalidateTag(CACHE_TAGS.coloringPages);
    revalidateTag(CACHE_TAGS.categories);
    revalidateTag(CACHE_TAGS.tags);
    createdPages.forEach((entry) => {
      revalidateTag(tagForColoringPage(entry.slug));
    });
    metadata.categories.forEach((slug) => {
      revalidateTag(tagForCategory(slug));
    });
    metadata.tags.forEach((slug) => {
      revalidateTag(tagForTag(slug));
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
