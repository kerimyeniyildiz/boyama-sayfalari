import { Buffer } from "node:buffer";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PDFDocument } from "pdf-lib";

export type ImageAssets = {
  cover: Buffer;
  thumbLarge: Buffer;
  thumbSmall: Buffer;
  width: number;
  height: number;
};

function getImages(): ImagesBinding {
  const images = getCloudflareContext().env.IMAGES;
  if (!images) {
    throw new Error("Cloudflare Images binding bulunamadı.");
  }
  return images;
}

function asArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

function asStream(buffer: Buffer): ReadableStream<Uint8Array> {
  return new Blob([asArrayBuffer(buffer)]).stream();
}

async function transform(
  buffer: Buffer,
  options: ImageTransform,
  format: "image/webp" | "image/png",
  quality?: number
): Promise<Buffer> {
  const transformed = await getImages()
    .input(asStream(buffer))
    .transform(options)
    .output({ format, ...(quality ? { quality } : {}) });
  const response = transformed.response();

  if (!response.ok) {
    throw new Error(`Cloudflare Images dönüşümü başarısız: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function generateImageAssets(buffer: Buffer): Promise<ImageAssets> {
  const cover = await transform(
    buffer,
    { width: 1600, height: 2260, fit: "contain", background: "#ffffff" },
    "image/webp",
    90
  );
  const info = await getImages().info(asStream(cover));

  const [thumbLarge, thumbSmall] = await Promise.all([
    transform(
      cover,
      { width: 800, height: 1130, fit: "scale-down" },
      "image/webp",
      85
    ),
    transform(
      cover,
      { width: 400, height: 566, fit: "scale-down" },
      "image/webp",
      80
    )
  ]);

  return {
    cover,
    thumbLarge,
    thumbSmall,
    width: "width" in info ? info.width : 0,
    height: "height" in info ? info.height : 0
  };
}

export async function generatePdfFromImage(buffer: Buffer): Promise<Buffer> {
  const pngBuffer = await transform(
    buffer,
    { width: 2480, height: 3508, fit: "contain", background: "#ffffff" },
    "image/png"
  );

  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(pngBuffer);
  const pageWidth = 2480;
  const pageHeight = 3508;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const scale = Math.min(
    pageWidth / pngImage.width,
    pageHeight / pngImage.height,
    1
  );
  const width = pngImage.width * scale;
  const height = pngImage.height * scale;

  page.drawImage(pngImage, {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height
  });

  return Buffer.from(await pdfDoc.save());
}

export function getBufferSize(buffer: Buffer): number {
  return buffer.byteLength;
}
