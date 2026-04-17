import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * AI toplu üretim işlerinin ilerlemesini sorgulamak için admin UI tarafından
 * polling ile çağrılan endpoint. Orta büyüklükte veri döndürür; `payload`
 * sırlı bilgi barındırmadığı için dahil edilir ancak `result` sadece
 * tamamlanmış işlerde gelir.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const job = await prisma.generationJob.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      type: true,
      status: true,
      progressCurrent: true,
      progressTotal: true,
      error: true,
      result: true,
      createdAt: true,
      startedAt: true,
      completedAt: true
    }
  });

  if (!job) {
    return jsonError(404, "JOB_NOT_FOUND", "İş bulunamadı.");
  }

  return NextResponse.json(
    { data: job },
    { headers: { "Cache-Control": "no-store" } }
  );
}
