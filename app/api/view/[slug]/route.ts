import { NextResponse } from "next/server";

import { getViewablePage, incrementViews } from "@/lib/data/coloring-pages";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug?.trim();

  if (!slug) {
    return NextResponse.json(
      { error: "Slug gerekli." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const page = await getViewablePage(slug);
  if (!page) {
    return NextResponse.json(
      { error: "Boyama sayfasÄ± bulunamadÄ±." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  await incrementViews(page.id);

  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
