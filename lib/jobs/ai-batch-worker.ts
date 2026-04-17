import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { GenerationJobStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { sanitizeSeoContent } from "@/lib/html";
import {
  generateImageAssets,
  generatePdfFromImage,
  getBufferSize
} from "@/lib/images";
import { detectImageMimeTypeFromBuffer } from "@/lib/image-sniff";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import {
  generateImageBuffer,
  generateImageName,
  generateTextWithReplicate
} from "@/lib/ai/replicate";
import { buildColoringPagePath } from "@/lib/page-paths";
import { resolvePublicationState } from "@/lib/publishing";
import { pageMetadataSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import {
  CACHE_TAGS,
  tagForCategory,
  tagForColoringPage,
  tagForTag
} from "@/lib/cache-tags";
import {
  aiBatchJobPayloadSchema,
  type AiBatchJobPayload,
  type AiBatchJobResult
} from "@/lib/jobs/schema";

const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PDF_CACHE_CONTROL = "public, max-age=31536000, immutable";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type SlugifyOptions = Record<string, unknown>;
type SlugifyFn = (input: string, options?: SlugifyOptions) => string;

const slugifyTr = (value: string) =>
  (slugify as unknown as SlugifyFn)(value, { lower: true, locale: "tr" });

type ImageSource = {
  name: string;
  buffer: Buffer;
  mimeType: string;
  mimeTrusted: boolean;
  label: string;
  slugHint: string;
};

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

  const compact = normalized
    .split(" ")
    .filter((part) => part.length > 0)
    .slice(0, 6)
    .join(" ");
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
  const base =
    source.slugHint && source.slugHint.length > 0 ? source.slugHint : source.name;
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

  return generateTextWithReplicate(prompt);
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

  const generated = normalizeGeneratedParagraph(
    await generateTextWithReplicate(prompt)
  );
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

async function createSourcesFromPrompts(
  prompts: string[],
  onProgress?: (current: number, total: number) => Promise<void> | void
): Promise<ImageSource[]> {
  const sources: ImageSource[] = [];
  const usedNames = new Set<string>();

  for (let index = 0; index < prompts.length; index += 1) {
    const originalPrompt = prompts[index];
    const namingPrompt = `Create one short Turkish title for this coloring page image.

Rules:
- Return only the title
- No explanation
- No extra text
- No headings
- No JSON
- No punctuation
- No quotation marks
- No numbering
- The title should sound natural for a coloring pages website
- The title should be clear simple and SEO-friendly
- Use common Turkish search phrasing
- Maximum 6 words

Image prompt:
${originalPrompt}`;

    let rawName: string;
    try {
      rawName = await generateImageName(namingPrompt);
    } catch (error) {
      throw new Error(
        `Görsel adı üretilemedi (satır ${index + 1}): ${(error as Error).message}`
      );
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
      throw new Error(
        `Görsel üretimi başarısız oldu (satır ${index + 1}): ${(error as Error).message}`
      );
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

    if (onProgress) {
      await onProgress(index + 1, prompts.length);
    }
  }

  return sources;
}

async function updateProgress(jobId: string, current: number, total: number) {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { progressCurrent: current, progressTotal: total }
  });
}

type RunOutcome =
  | { success: true; result: AiBatchJobResult }
  | { success: false; error: string };

/**
 * AI destekli toplu boyama sayfası üretim işini çalıştırır.
 * İş zaten PROCESSING durumuna alınmış olmalıdır. Bu fonksiyon
 * adım adım ilerleme güncellemeleri yapar, hata halinde R2'ye
 * yüklenmiş yarım asset'leri temizler ve işi FAILED/COMPLETED
 * olarak kapatır. Çağıran `enqueue` tarafı bu fonksiyonu
 * fire-and-forget olarak çağırabilir.
 */
export async function runAiBatchJob(jobId: string): Promise<RunOutcome> {
  const jobRecord = await prisma.generationJob.findUnique({
    where: { id: jobId }
  });

  if (!jobRecord) {
    return { success: false, error: "İş bulunamadı." };
  }

  const payloadParsed = aiBatchJobPayloadSchema.safeParse(jobRecord.payload);
  if (!payloadParsed.success) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: GenerationJobStatus.FAILED,
        error: "İş yükü geçersiz.",
        completedAt: new Date()
      }
    });
    return { success: false, error: "İş yükü geçersiz." };
  }

  const payload: AiBatchJobPayload = payloadParsed.data;

  const uploadedKeys: string[] = [];

  try {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: GenerationJobStatus.PROCESSING,
        startedAt: jobRecord.startedAt ?? new Date(),
        attempts: { increment: 1 },
        error: null,
        progressCurrent: 0,
        progressTotal: payload.promptLines.length
      }
    });

    const sources = await createSourcesFromPrompts(
      payload.promptLines,
      async (current, total) => {
        await updateProgress(jobId, current, total);
      }
    );

    for (const image of sources) {
      if (!image.mimeTrusted || !ALLOWED_IMAGE_TYPES.has(image.mimeType)) {
        throw new Error(
          "Üretilen görsellerden biri kabul edilen formatlarda değil."
        );
      }

      if (image.buffer.byteLength > MAX_IMAGE_SIZE) {
        throw new Error(
          `Üretilen görsel ${MAX_IMAGE_SIZE / (1024 * 1024)}MB sınırını aştı.`
        );
      }
    }

    const [primaryImage, ...additionalImages] = sources;

    const anchorTopic =
      payload.anchor.length > 0 ? buildTopicFromAnchor(payload.anchor) : "";
    const hasAnchor = anchorTopic.length > 0;

    let descriptionRaw = payload.description;
    let seoContentRaw = payload.seoContent;

    if (hasAnchor) {
      descriptionRaw = await generateAutoMetaDescription(
        anchorTopic,
        payload.pageCount
      );
      seoContentRaw = await generateAutoSeoParagraph(anchorTopic);
    }

    const publicationState = resolvePublicationState({
      requestedStatus: payload.status,
      publishAtRaw: payload.publishAtRaw
    });

    if (!publicationState.ok) {
      throw new Error(publicationState.message);
    }

    const fallbackTitle = primaryImage.label?.trim() ?? "";
    const fallbackSlug = deriveSlugFromSource(primaryImage);
    const trimmedTitle = payload.title.trim();
    const normalizedTitleKey =
      trimmedTitle.length > 0 ? normalizeForComparison(trimmedTitle) : "";
    const normalizedFirstPrompt =
      payload.promptLines.length > 0
        ? normalizeForComparison(payload.promptLines[0])
        : "";

    let effectiveTitle = trimmedTitle;
    if (hasAnchor) {
      effectiveTitle = `${anchorTopic} Boyama Sayfaları | ${payload.pageCount}+ Ücretsiz PDF`;
    } else {
      if (
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

    const trimmedSlugInput = payload.slug.trim();
    const slugSource =
      generatedAnchorSlug ||
      (trimmedSlugInput.length > 0 ? trimmedSlugInput : effectiveTitle);
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
      categories: payload.categories,
      tags: payload.tags,
      seoContent: seoContentRaw
    };

    const metadata = pageMetadataSchema.parse(metadataInput);
    const sanitizedSeoContent = sanitizeSeoContent(metadata.seoContent);
    const normalizedSeoContent =
      sanitizedSeoContent.length > 0 ? sanitizedSeoContent : null;

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

    const usedSlugs = new Set<string>();
    const parentSlug = await ensureUniqueSlug(metadata.slug, usedSlugs);
    const parentAssets = await uploadPageAssets(
      primaryImage,
      parentSlug,
      uploadedKeys
    );

    const createdSlugs: string[] = [];
    const createdEntries: Array<{ slug: string; parentSlug: string | null }> = [];

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

    createdSlugs.push(parentSlug);
    createdEntries.push({ slug: parentSlug, parentSlug: null });

    for (const imageSource of additionalImages) {
      const baseSlug = deriveSlugFromSource(imageSource);
      const childSlug = await ensureUniqueSlug(baseSlug, usedSlugs);
      const computedTitle =
        imageSource.label && imageSource.label.length > 0
          ? imageSource.label
          : humanizeSlug(childSlug);
      const childAssets = await uploadPageAssets(
        imageSource,
        childSlug,
        uploadedKeys
      );

      await prisma.coloringPage.create({
        data: {
          slug: childSlug,
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

      createdSlugs.push(childSlug);
      createdEntries.push({ slug: childSlug, parentSlug });
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
    createdEntries.forEach((entry) => revalidatePath(buildColoringPagePath(entry)));
    metadata.categories.forEach((slug) => revalidatePath(`/kategori/${slug}`));
    metadata.tags.forEach((slug) => revalidatePath(`/etiket/${slug}`));

    revalidateTag(CACHE_TAGS.coloringPages);
    revalidateTag(CACHE_TAGS.categories);
    revalidateTag(CACHE_TAGS.tags);
    createdSlugs.forEach((slug) => revalidateTag(tagForColoringPage(slug)));
    metadata.categories.forEach((slug) => revalidateTag(tagForCategory(slug)));
    metadata.tags.forEach((slug) => revalidateTag(tagForTag(slug)));

    const result: AiBatchJobResult = { createdSlugs, parentSlug };

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: GenerationJobStatus.COMPLETED,
        completedAt: new Date(),
        result: result as unknown as Prisma.InputJsonValue,
        progressCurrent: payload.promptLines.length,
        progressTotal: payload.promptLines.length
      }
    });

    return { success: true, result };
  } catch (error) {
    await Promise.all(
      uploadedKeys.map((key) => deleteFromR2(key).catch(() => undefined))
    );

    const message =
      error instanceof Error ? error.message : "İş çalıştırılamadı.";

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: GenerationJobStatus.FAILED,
        error: message,
        completedAt: new Date()
      }
    });

    return { success: false, error: message };
  }
}

/**
 * Enqueue edilen işi aynı process içinde fire-and-forget olarak başlatır.
 * Bu, ilk isteğe hızlı yanıt verirken işi arka planda yürütür.
 * Cron fallback endpoint'i de `runAiBatchJob`'u çağırabilir (bkz.
 * `/api/internal/process-jobs`).
 */
export function startAiBatchJobInBackground(jobId: string) {
  setImmediate(() => {
    runAiBatchJob(jobId).catch((error) => {
      console.error(`AI batch job ${jobId} yürütülemedi`, error);
    });
  });
}
