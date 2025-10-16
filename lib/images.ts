import sharp from "sharp";

export type WebpVariants = {
  small: Buffer;
  large: Buffer;
  width?: number;
  height?: number;
};

export async function generateWebpVariants(buffer: Buffer): Promise<WebpVariants> {
  const instance = sharp(buffer);
  const metadata = await instance.metadata();

  const small = await instance
    .clone()
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const large = await instance
    .clone()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  return {
    small,
    large,
    width: metadata.width,
    height: metadata.height
  };
}

export function getBufferSize(buffer: Buffer): number {
  return Buffer.byteLength(buffer);
}
