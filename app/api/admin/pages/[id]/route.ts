import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { pageMetadataSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { generateWebpVariants, getBufferSize } from "@/lib/images";
import { deleteFromR2, uploadToR2 } from "@/lib/r2";

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
    return NextResponse.json({ error: "Sayfa bulunamadı." }, { status: 404 });
  }

  const title = toString(formData.get("title")) || existingPage.title;
  const rawSlug = toString(formData.get("slug"));
  const computedSlug = rawSlug
    ? slugify(rawSlug)
    : existingPage.slug;

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
    description: toString(formData.get("description")) || existingPage.description,
    difficulty:
      toString(formData.get("difficulty")).toUpperCase() ||
      existingPage.difficulty,
    orientation:
      toString(formData.get("orientation")).toUpperCase() ||
      existingPage.orientation,
    ageMin: toString(formData.get("ageMin")),
    ageMax: toString(formData.get("ageMax")),
    artist: toOptionalString(formData.get("artist")) ?? existingPage.artist ?? undefined,
    license: toOptionalString(formData.get("license")) ?? existingPage.license ?? undefined,
    sourceUrl: toOptionalString(formData.get("sourceUrl")) ?? existingPage.sourceUrl ?? undefined,
    status:
      toString(formData.get("status")).toUpperCase() ||
      existingPage.status,
    language: toString(formData.get("language")) || existingPage.language,
    categories:
      submittedCategories.length > 0
        ? submittedCategories
        : existingPage.categories.map((item) => item.category.slug),
    tags:
      submittedTags.length > 0
        ? submittedTags
        : existingPage.tags.map((item) => item.tag.slug),
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
  const pdfFile = formData.get("pdf");
  const coverFile = formData.get("cover");

  const slugChanged = metadata.slug !== existingPage.slug;

  if (slugChanged && !(pdfFile instanceof File) && !(coverFile instanceof File)) {
    return NextResponse.json(
      {
        error:
          "Slug değiştirildiğinde PDF ve kapak dosyalarının yeniden yüklenmesi gerekir."
      },
      { status: 400 }
    );
  }

  let pdfKey = existingPage.pdfKey;
  let coverKey = existingPage.coverImageKey;
  let thumbKeyLarge = existingPage.thumbWebpKey;
  const thumbKeySmall = thumbKeyLarge.replace("-800.webp", "-400.webp");

  const uploadedKeys: string[] = [];
  const keysToDelete: string[] = [];

  try {
    if (pdfFile instanceof File && pdfFile.size > 0) {
      const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
      pdfKey = `pdf/${metadata.slug}.pdf`;
      await uploadToR2({
        key: pdfKey,
        body: pdfBuffer,
        contentType: "application/pdf",
        cacheControl: PDF_CACHE_CONTROL
      });
      uploadedKeys.push(pdfKey);
      keysToDelete.push(existingPage.pdfKey);
      metadata.fileSizeBytes = metadata.fileSizeBytes ?? getBufferSize(pdfBuffer);
    }

    if (coverFile instanceof File && coverFile.size > 0) {
      const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
      const variants = await generateWebpVariants(coverBuffer);
      const extension = coverFile.type.split("/")[1] ?? "jpg";
      coverKey = `cover/${metadata.slug}.${extension}`;
      thumbKeyLarge = `thumb/${metadata.slug}-800.webp`;
      const newThumbSmall = `thumb/${metadata.slug}-400.webp`;

      await uploadToR2({
        key: coverKey,
        body: coverBuffer,
        contentType: coverFile.type,
        cacheControl: IMAGE_CACHE_CONTROL
      });
      uploadedKeys.push(coverKey);

      await uploadToR2({
        key: newThumbSmall,
        body: variants.small,
        contentType: "image/webp",
        cacheControl: IMAGE_CACHE_CONTROL
      });
      uploadedKeys.push(newThumbSmall);

      await uploadToR2({
        key: thumbKeyLarge,
        body: variants.large,
        contentType: "image/webp",
        cacheControl: IMAGE_CACHE_CONTROL
      });
      uploadedKeys.push(thumbKeyLarge);

      keysToDelete.push(existingPage.coverImageKey, existingPage.thumbWebpKey, thumbKeySmall);

      metadata.width = variants.width ?? metadata.width;
      metadata.height = variants.height ?? metadata.height;
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
        width: metadata.width ?? existingPage.width,
        height: metadata.height ?? existingPage.height,
        fileSizeBytes: metadata.fileSizeBytes ?? existingPage.fileSizeBytes,
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
    return NextResponse.json(
      { error: "Sayfa güncellenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
