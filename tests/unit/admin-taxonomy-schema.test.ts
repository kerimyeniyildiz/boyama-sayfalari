import { describe, expect, it } from "vitest";

import { createCategorySchema, createTagSchema } from "@/lib/validation";

describe("createCategorySchema", () => {
  it("allows slug to be omitted and generates undefined", () => {
    const result = createCategorySchema.parse({
      name: "Hayvanlar"
    });
    expect(result.name).toBe("Hayvanlar");
    expect(result.slug).toBeUndefined();
  });

  it("converts empty slug strings to undefined", () => {
    const result = createCategorySchema.parse({
      name: "Masallar",
      slug: ""
    });
    expect(result.slug).toBeUndefined();
  });
});

describe("createTagSchema", () => {
  it("accepts optional slug", () => {
    const result = createTagSchema.parse({
      name: "fantastik"
    });
    expect(result.slug).toBeUndefined();
  });

  it("keeps provided slug when present", () => {
    const result = createTagSchema.parse({
      name: "uzay",
      slug: "uzay"
    });
    expect(result.slug).toBe("uzay");
  });
});
