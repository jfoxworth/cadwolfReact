interface Bucket {
  count: number;
  resetAt: number;
}

// Global map persists across requests within the same Node.js process
const store = new Map<string, Bucket>();

// Clean up expired buckets every minute to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt < now) store.delete(key);
  }
}, 60_000);

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Returns { limited: true } if the IP has exceeded the rate limit for this key.
 * Call at the top of sensitive API route handlers before any DB work.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { limited: boolean; remaining: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { limited: false, remaining: config.limit - 1 };
  }

  bucket.count += 1;
  const remaining = Math.max(0, config.limit - bucket.count);
  return { limited: bucket.count > config.limit, remaining };
}

/** Extract client IP from Next.js request headers. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0] : "unknown").trim();
}
