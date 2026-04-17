import crypto from "node:crypto";
import { GenerationJobStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { runAiBatchJob } from "@/lib/jobs/ai-batch-worker";

export const runtime = "nodejs";

const MAX_JOBS_PER_RUN = 2;
const STUCK_PROCESSING_MINUTES = 10;

function isAuthorized(request: Request) {
  const secret = env.INTERNAL_CRON_SECRET;
  if (!secret) {
    return false;
  }

  const provided =
    request.headers.get("x-internal-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  const secretBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  if (secretBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(secretBuffer, providedBuffer);
}

/**
 * İş kuyruğu için cron fallback. Fire-and-forget ile başlayan işler
 * sunucu restart, crash ya da benzer bir durumda ortada kalırsa veya
 * kuyruğa yeni eklenmiş PENDING işler varsa bu endpoint onları tamamlar.
 * Harici bir cron servisinden dakikada bir çağrılabilir.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Yetkisiz erişim" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const now = Date.now();
  const stuckCutoff = new Date(now - STUCK_PROCESSING_MINUTES * 60 * 1000);

  // Önce ortada kalmış PROCESSING işleri tekrar PENDING'e al,
  // sonra PENDING işleri kuyruktan çekip çalıştır.
  await prisma.generationJob.updateMany({
    where: {
      status: GenerationJobStatus.PROCESSING,
      startedAt: { lt: stuckCutoff }
    },
    data: {
      status: GenerationJobStatus.PENDING
    }
  });

  const pendingJobs = await prisma.generationJob.findMany({
    where: {
      status: GenerationJobStatus.PENDING,
      type: "AI_COLORING_PAGES_BATCH"
    },
    orderBy: { createdAt: "asc" },
    take: MAX_JOBS_PER_RUN,
    select: { id: true }
  });

  if (pendingJobs.length === 0) {
    return NextResponse.json(
      { success: true, processed: 0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const outcomes = await Promise.all(
    pendingJobs.map((job) => runAiBatchJob(job.id))
  );

  return NextResponse.json(
    {
      success: true,
      processed: pendingJobs.length,
      succeeded: outcomes.filter((outcome) => outcome.success).length,
      failed: outcomes.filter((outcome) => !outcome.success).length
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
