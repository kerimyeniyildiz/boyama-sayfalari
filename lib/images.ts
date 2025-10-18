import sharp from "sharp";

export type ImageAssets = {
  cover: Buffer;
  thumbLarge: Buffer;
  thumbSmall: Buffer;
  width: number;
  height: number;
};

export async function generateImageAssets(buffer: Buffer): Promise<ImageAssets> {
  const portraitBase = sharp(buffer).rotate();

  const coverBuffer = await portraitBase
    .clone()
    .resize({
      width: 1600,
      height: 2260,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .webp({ quality: 90 })
    .toBuffer();

  const coverMeta = await sharp(coverBuffer).metadata();

  const thumbLarge = await sharp(coverBuffer)
    .clone()
    .resize({
      width: 800,
      height: 1130,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality: 85 })
    .toBuffer();

  const thumbSmall = await sharp(coverBuffer)
    .clone()
    .resize({
      width: 400,
      height: 566,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    cover: coverBuffer,
    thumbLarge,
    thumbSmall,
    width: coverMeta.width ?? 0,
    height: coverMeta.height ?? 0
  };
}

export async function generatePdfFromImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({
      width: 2480,
      height: 3508,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toFormat("pdf")
    .toBuffer();
}

export function getBufferSize(buffer: Buffer): number {
  return Buffer.byteLength(buffer);
}
