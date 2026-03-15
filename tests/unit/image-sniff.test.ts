import { describe, expect, it } from "vitest";

import { detectImageMimeTypeFromBuffer } from "@/lib/image-sniff";

describe("detectImageMimeTypeFromBuffer", () => {
  it("detects png buffers", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectImageMimeTypeFromBuffer(png)).toBe("image/png");
  });

  it("detects jpeg buffers", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageMimeTypeFromBuffer(jpeg)).toBe("image/jpeg");
  });

  it("detects webp buffers", () => {
    const webp = Buffer.from("52494646000000005745425056503820", "hex");
    expect(detectImageMimeTypeFromBuffer(webp)).toBe("image/webp");
  });

  it("detects svg buffers", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8");
    expect(detectImageMimeTypeFromBuffer(svg)).toBe("image/svg+xml");
  });

  it("returns null for unknown data", () => {
    const unknown = Buffer.from("not-an-image", "utf8");
    expect(detectImageMimeTypeFromBuffer(unknown)).toBeNull();
  });
});
