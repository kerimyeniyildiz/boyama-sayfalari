import { describe, expect, it } from "vitest";

import { pageMetadataSchema } from "@/lib/validation";

describe("pageMetadataSchema", () => {
  it("rejects missing or invalid required fields", () => {
    const result = pageMetadataSchema.safeParse({
      title: "",
      slug: "",
      description: "too short",
      difficulty: "EASY",
      orientation: "PORTRAIT",
      status: "DRAFT",
      language: "tr",
      categories: [],
      tags: []
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.title).toBeTruthy();
      expect(fieldErrors.slug).toBeTruthy();
      expect(fieldErrors.description).toBeTruthy();
    }
  });

  it("accepts a complete payload", () => {
    const result = pageMetadataSchema.safeParse({
      title: "Valid Coloring Page",
      slug: "valid-coloring-page",
      description: "This description is comfortably longer than twenty chars.",
      difficulty: "MEDIUM",
      orientation: "LANDSCAPE",
      status: "PUBLISHED",
      language: "tr",
      categories: ["animals"],
      tags: ["forest"],
      ageMin: 4,
      ageMax: 8
    });

    expect(result.success).toBe(true);
  });
});
