type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitBucket>();

type ConsumeRateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function consumeRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now()
}: ConsumeRateLimitInput): RateLimitResult {
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  existing.count += 1;
  store.set(key, existing);

  const remaining = Math.max(0, limit - existing.count);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existing.resetAt - now) / 1000)
  );

  return {
    allowed: existing.count <= limit,
    remaining,
    retryAfterSeconds
  };
}

export function clearRateLimitStore() {
  store.clear();
}
