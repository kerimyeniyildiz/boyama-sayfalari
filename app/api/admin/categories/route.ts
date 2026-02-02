import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { createCategorySchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { getAdminCategories } from "@/lib/data/admin/categories";
import { CACHE_TAGS, tagForCategory } from "@/lib/cache-tags";

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
  const categories = await getAdminCategories();
  return NextResponse.json({ data: categories });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Geçersiz JSON gövdesi.");
  }

  try {
    const parsed = createCategorySchema.parse(body);
    const name = parsed.name.trim();
    const computedSlug = slugify(parsed.slug ?? parsed.name);

    const category = await prisma.category.create({
      data: {
        name,
        slug: computedSlug
      }
    });

    revalidatePath("/");
    revalidatePath("/ara");
    revalidatePath(`/kategori/${category.slug}`);
    revalidatePath("/admin/pages");
    revalidatePath("/admin/pages/new");
    revalidatePath("/admin/categories");

    revalidateTag(CACHE_TAGS.categories);
    revalidateTag(CACHE_TAGS.coloringPages);
    revalidateTag(tagForCategory(category.slug));

    return NextResponse.json({
      success: true,
      category
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
        "CATEGORY_EXISTS",
        "Bu slug ile zaten bir kategori bulunuyor.",
        {
          slug: ["Bu slug zaten kullanılıyor."]
        }
      );
    }

    console.error("Kategori oluşturulamadı", error);
    return jsonError(
      500,
      "CATEGORY_CREATE_FAILED",
      "Kategori oluşturulurken bir hata oluştu."
    );
  }
}
