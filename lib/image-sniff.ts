const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWithBytes(buffer: Buffer, signature: number[]) {
  if (buffer.length < signature.length) {
    return false;
  }
  return signature.every((value, index) => buffer[index] === value);
}

function isWebp(buffer: Buffer) {
  if (buffer.length < 12) {
    return false;
  }
  return (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function isLikelySvg(buffer: Buffer) {
  const preview = buffer.subarray(0, 2048).toString("utf8").trimStart().toLowerCase();
  if (preview.startsWith("<svg")) {
    return true;
  }
  if (preview.startsWith("<?xml")) {
    return preview.includes("<svg");
  }
  return false;
}

export function detectImageMimeTypeFromBuffer(buffer: Buffer):
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/svg+xml"
  | null {
  if (startsWithBytes(buffer, PNG_SIGNATURE)) {
    return "image/png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (isWebp(buffer)) {
    return "image/webp";
  }

  if (isLikelySvg(buffer)) {
    return "image/svg+xml";
  }

  return null;
}
