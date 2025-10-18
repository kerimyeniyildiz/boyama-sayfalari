import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const category = await prisma.category.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { pages: true } }
    }
  });

  if (!category) {
    return jsonError(404, "CATEGORY_NOT_FOUND", "Kategori bulunamadı.");
  }

  if (category._count.pages > 0) {
    return jsonError(
      400,
      "CATEGORY_IN_USE",
      "Kategoriye bağlı sayfalar bulunduğu için silinemiyor."
    );
  }

  try {
    await prisma.category.delete({
      where: { id: params.id }
    });
  } catch (error) {
    console.error("Kategori silinemedi", error);
    return jsonError(
      500,
      "CATEGORY_DELETE_FAILED",
      "Kategori silinirken bir hata oluştu."
    );
  }

  revalidatePath("/");
  revalidatePath("/ara");
  revalidatePath("/admin/pages");
  revalidatePath("/admin/pages/new");
  revalidatePath("/admin/categories");
  revalidatePath(`/kategori/${category.slug}`);

  return NextResponse.json({ success: true });
}
