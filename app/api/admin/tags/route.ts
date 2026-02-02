import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { createTagSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { getAdminTags } from "@/lib/data/admin/tags";
import { CACHE_TAGS, tagForTag } from "@/lib/cache-tags";

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

export async function GET() {
  const tags = await getAdminTags();
  return NextResponse.json({ data: tags });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Geçersiz JSON gövdesi.");
  }

  try {
    const parsed = createTagSchema.parse(body);
    const name = parsed.name.trim();
    const computedSlug = slugify(parsed.slug ?? parsed.name);

    const tag = await prisma.tag.create({
      data: {
        name,
        slug: computedSlug
      }
    });

    revalidatePath("/");
    revalidatePath("/ara");
    revalidatePath(`/etiket/${tag.slug}`);
    revalidatePath("/admin/pages");
    revalidatePath("/admin/pages/new");
    revalidatePath("/admin/tags");

    revalidateTag(CACHE_TAGS.tags);
    revalidateTag(CACHE_TAGS.coloringPages);
    revalidateTag(tagForTag(tag.slug));

    return NextResponse.json({
      success: true,
      tag
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = normalizeFieldErrors(error.flatten().fieldErrors);
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Form alanlarında hatalar var.",
        fieldErrors
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(
        409,
        "TAG_EXISTS",
        "Bu slug ile zaten bir etiket bulunuyor.",
        {
          slug: ["Bu slug zaten kullanılıyor."]
        }
      );
    }

    console.error("Etiket oluşturulamadı", error);
    return jsonError(
      500,
      "TAG_CREATE_FAILED",
      "Etiket oluşturulurken bir hata oluştu."
    );
  }
}
