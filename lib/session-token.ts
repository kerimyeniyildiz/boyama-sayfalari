import crypto from "node:crypto";

export type SessionPayload = {
  email: string;
  issuedAt: number;
};

export function signSessionToken(
  payload: SessionPayload,
  secret: string
): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function parseSessionToken(
  token: string,
  secret: string
): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;

    if (
      typeof payload.email === "string" &&
      typeof payload.issuedAt === "number"
    ) {
      return payload;
    }
  } catch {
    return null;
  }

  return null;
}
