import { describe, expect, it } from "vitest";

import { adminPageListQuerySchema } from "@/lib/validation";

describe("adminPageListQuerySchema", () => {
  it("returns defaults when no params provided", () => {
    const result = adminPageListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.status).toBe("ALL");
    expect(result.query).toBeUndefined();
  });

  it("trims empty queries to undefined", () => {
    const result = adminPageListQuerySchema.parse({ query: "   " });
    expect(result.query).toBeUndefined();
  });

  it("rejects unsupported status values", () => {
    expect(() =>
      adminPageListQuerySchema.parse({ status: "INVALID" })
    ).toThrow();
  });
});
