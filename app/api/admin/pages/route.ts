import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { pageMetadataSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { generateWebpVariants, getBufferSize } from "@/lib/images";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PDF_CACHE_CONTROL = "public, max-age=31536000, immutable";

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

export async function POST(request: Request) {
  const formData = await request.formData();

  const pdfFile = formData.get("pdf");
  const coverFile = formData.get("cover");

  if (!(pdfFile instanceof File) || pdfFile.size === 0) {
    return NextResponse.json(
      { error: "PDF dosyası eksik." },
      { status: 400 }
    );
  }

  if (!(coverFile instanceof File) || coverFile.size === 0) {
    return NextResponse.json(
      { error: "Kapak görseli eksik." },
      { status: 400 }
    );
  }

  const title = toString(formData.get("title"));
  if (!title) {
    return NextResponse.json(
      { error: "Başlık gereklidir." },
      { status: 400 }
    );
  }

  const rawSlug = toString(formData.get("slug"));
  const computedSlug = rawSlug ? slugify(rawSlug) : slugify(title);

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
    categories: formData
      .getAll("categories")
      .filter((value): value is string => typeof value === "string" && value),
    tags: formData
      .getAll("tags")
      .filter((value): value is string => typeof value === "string" && value),
    width: toString(formData.get("width")),
    height: toString(formData.get("height")),
    fileSizeBytes: toString(formData.get("fileSizeBytes"))
  };

  const parsed = pageMetadataSchema.safeParse(metadataInput);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
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
    return NextResponse.json(
      { error: "Sayfa oluşturulurken bir hata oluştu." },
      { status: 500 }
    );
  }
}
