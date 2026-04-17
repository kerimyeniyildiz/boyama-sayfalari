import { describe, expect, it } from "vitest";

import { buildColoringPageAlt } from "@/lib/image-alt";

describe("buildColoringPageAlt", () => {
  it("appends 'boyama sayfası' when title does not mention it", () => {
    expect(buildColoringPageAlt("Kedi")).toBe("Kedi boyama sayfası");
  });

  it("keeps existing phrasing when the title already mentions boyama sayfa*", () => {
    expect(buildColoringPageAlt("Kedi Boyama Sayfaları")).toBe(
      "Kedi Boyama Sayfaları"
    );
    expect(buildColoringPageAlt("Orman dostları boyama sayfası")).toBe(
      "Orman dostları boyama sayfası"
    );
  });

  it("handles Turkish casing in detection", () => {
    expect(buildColoringPageAlt("Çiçek BOYAMA SAYFASI")).toBe(
      "Çiçek BOYAMA SAYFASI"
    );
  });

  it("falls back to a generic label for empty input", () => {
    expect(buildColoringPageAlt("")).toBe("Boyama sayfası");
    expect(buildColoringPageAlt(null)).toBe("Boyama sayfası");
    expect(buildColoringPageAlt(undefined)).toBe("Boyama sayfası");
  });

  it("trims surrounding whitespace from the provided title", () => {
    expect(buildColoringPageAlt("   Prenses   ")).toBe(
      "Prenses boyama sayfası"
    );
  });
});
