import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { prisma } from "@/lib/db";
import { enforceAdminMutationLimit } from "@/lib/admin-rate-limit";
import { CACHE_TAGS, tagForTag } from "@/lib/cache-tags";

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
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const rateLimited = await enforceAdminMutationLimit(request, "tags:delete");
  if (rateLimited) {
    return rateLimited;
  }
  const tag = await prisma.tag.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { pages: true } }
    }
  });

  if (!tag) {
    return jsonError(404, "TAG_NOT_FOUND", "Etiket bulunamadı.");
  }

  if (tag._count.pages > 0) {
    return jsonError(
      400,
      "TAG_IN_USE",
      "Etikete bağlı sayfalar bulunduğu için silinemiyor."
    );
  }

  try {
    await prisma.tag.delete({
      where: { id: params.id }
    });
  } catch (error) {
    console.error("Etiket silinemedi", error);
    return jsonError(
      500,
      "TAG_DELETE_FAILED",
      "Etiket silinirken bir hata oluştu."
    );
  }

  revalidatePath("/");
  revalidatePath("/ara");
  revalidatePath("/admin/pages");
  revalidatePath("/admin/pages/new");
  revalidatePath("/admin/tags");
  revalidatePath(`/etiket/${tag.slug}`);

  revalidateTag(CACHE_TAGS.tags, "max");
  revalidateTag(CACHE_TAGS.coloringPages, "max");
  revalidateTag(tagForTag(tag.slug), "max");

  return NextResponse.json({ success: true });
}
