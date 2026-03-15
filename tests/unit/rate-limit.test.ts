import { afterEach, describe, expect, it } from "vitest";

import {
  clearRateLimitStore,
  consumeRateLimit
} from "@/lib/rate-limit";

describe("rate-limit", () => {
  afterEach(() => {
    clearRateLimitStore();
  });

  it("allows requests until the configured limit", () => {
    const first = consumeRateLimit({
      key: "admin-login:test@example.com:1.1.1.1",
      limit: 2,
      windowMs: 60_000,
      now: 1000
    });
    const second = consumeRateLimit({
      key: "admin-login:test@example.com:1.1.1.1",
      limit: 2,
      windowMs: 60_000,
      now: 2000
    });
    const third = consumeRateLimit({
      key: "admin-login:test@example.com:1.1.1.1",
      limit: 2,
      windowMs: 60_000,
      now: 3000
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets counters after window expires", () => {
    consumeRateLimit({
      key: "admin-login:test@example.com:1.1.1.1",
      limit: 1,
      windowMs: 60_000,
      now: 1000
    });
    const blocked = consumeRateLimit({
      key: "admin-login:test@example.com:1.1.1.1",
      limit: 1,
      windowMs: 60_000,
      now: 2000
    });
    const afterWindow = consumeRateLimit({
      key: "admin-login:test@example.com:1.1.1.1",
      limit: 1,
      windowMs: 60_000,
      now: 62_000
    });

    expect(blocked.allowed).toBe(false);
    expect(afterWindow.allowed).toBe(true);
  });
});
