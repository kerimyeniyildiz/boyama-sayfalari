import { describe, expect, it } from "vitest";

import { pageMetadataSchema } from "@/lib/validation";

describe("pageMetadataSchema", () => {
  it("rejects missing or invalid required fields", () => {
    const result = pageMetadataSchema.safeParse({
      title: "",
      slug: "",
      categories: [],
      tags: []
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.title).toBeTruthy();
      expect(fieldErrors.slug).toBeTruthy();
    }
  });

  it("accepts a minimal valid payload", () => {
    const result = pageMetadataSchema.safeParse({
      title: "Orman Dostları",
      slug: "orman-dostlari",
      categories: ["hayvanlar"],
      tags: ["orman"],
      description: "Orman dostlari temali boyama sayfasi koleksiyonu."
    });

    expect(result.success).toBe(true);
  });

  it.each(["admin", "api", "ara", "kategori", "etiket", "sitemap"])(
    "rejects reserved slug %s",
    (reservedSlug) => {
      const result = pageMetadataSchema.safeParse({
        title: "Orman Dostları",
        slug: reservedSlug,
        categories: ["hayvanlar"],
        tags: ["orman"],
        description: "Orman dostlari temali boyama sayfasi koleksiyonu."
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.slug).toBeTruthy();
      }
    }
  );
});
