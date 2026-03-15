import { describe, expect, it } from "vitest";

import {
  parseSessionToken,
  signSessionToken
} from "@/lib/session-token";

const SECRET = "test-secret-1234567890";

describe("session-token", () => {
  it("signs and parses valid session tokens", () => {
    const token = signSessionToken(
      {
        email: "admin@example.com",
        issuedAt: 1730000000000
      },
      SECRET
    );

    const parsed = parseSessionToken(token, SECRET);

    expect(parsed).toEqual({
      email: "admin@example.com",
      issuedAt: 1730000000000
    });
  });

  it("returns null for malformed token signatures", () => {
    const token = signSessionToken(
      {
        email: "admin@example.com",
        issuedAt: 1730000000000
      },
      SECRET
    );

    const [body] = token.split(".");
    const malformed = `${body}.x`;

    expect(parseSessionToken(malformed, SECRET)).toBeNull();
  });

  it("returns null for tampered tokens", () => {
    const token = signSessionToken(
      {
        email: "admin@example.com",
        issuedAt: 1730000000000
      },
      SECRET
    );

    const [body, signature] = token.split(".");
    const tamperedBody = Buffer.from(
      JSON.stringify({ email: "attacker@example.com", issuedAt: 1730000000000 })
    ).toString("base64url");

    expect(parseSessionToken(`${tamperedBody}.${signature}`, SECRET)).toBeNull();
    expect(parseSessionToken(`${body}.invalid-signature`, SECRET)).toBeNull();
  });
});
