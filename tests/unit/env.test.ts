import { describe, expect, it } from "vitest";

import { env } from "@/lib/env";

describe("env", () => {
  it("keeps optional/default keys accessible without throwing", () => {
    expect(() => env.NEXT_PUBLIC_SITE_NAME).not.toThrow();
    expect(typeof env.NEXT_PUBLIC_SITE_NAME).toBe("string");
  });

  it("throws only when a required key is accessed and missing", () => {
    const previous = process.env.SESSION_SECRET;
    Reflect.deleteProperty(process.env, "SESSION_SECRET");

    try {
      expect(() => env.SESSION_SECRET).toThrow();
    } finally {
      if (previous !== undefined) {
        process.env.SESSION_SECRET = previous;
      }
    }
  });
});
