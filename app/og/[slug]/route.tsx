import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";

import { getColoringPageBySlug } from "@/lib/data/coloring-pages";
import { siteConfig } from "@/lib/seo";

export const runtime = "edge";
export const revalidate = 3600;

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function GET(_: Request, context: RouteContext) {
  const page = await getColoringPageBySlug(context.params.slug);

  if (!page) {
    return NextResponse.next();
  }

  const topTags = page.tags.slice(0, 2).map((tag) => `#${tag.tag.name}`);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F8FBF9",
          color: "#1A202C",
          width: "100%",
          height: "100%",
          padding: "64px",
          fontFamily: "Plus Jakarta Sans"
        }}
      >
        <div style={{ fontSize: 24, color: "#4A5568" }}>{siteConfig.name}</div>
        <div>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.1,
              fontWeight: 700,
              marginBottom: 24
            }}
          >
            {page.title}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {page.categories.slice(0, 3).map((category) => (
              <span
                key={category.category.id}
                style={{
                  padding: "12px 20px",
                  borderRadius: 999,
                  background: "#B4E4D4",
                  color: "#2D3748",
                  fontSize: 24
                }}
              >
                {category.category.name}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            color: "#4A5568"
          }}
        >
          <span>PDF indir</span>
          <span>{topTags.join("  ")}</span>
          <span>{page.downloads} indirme</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: []
    }
  );
}
