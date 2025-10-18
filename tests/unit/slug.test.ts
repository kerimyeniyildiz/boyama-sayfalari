import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("handles Turkish characters", () => {
    expect(slugify("Çilekli Pasta")).toBe("cilekli-pasta");
  });

  it("normalizes whitespace and punctuation", () => {
    expect(slugify("  Uzay! Keşifçileri 2025 ")).toBe("uzay-kesifcileri-2025");
  });
});
