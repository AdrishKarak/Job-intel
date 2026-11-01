import { TRPCError } from "@trpc/server";

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale keys every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((t) => now - t < 3600_000);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Checks and increments rate limit for a given user and endpoint (api/RATE_LIMITS.md)
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  options: { maxRequests?: number; windowMs?: number } = {}
): void {
  const maxRequests = options.maxRequests ?? 30; // default 30 req
  const windowMs = options.windowMs ?? 60_000; // default 1 minute

  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((windowMs - (now - oldestTimestamp)) / 1000);

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded for ${endpoint}. Please wait ${retryAfterSeconds} seconds before retrying.`,
    });
  }

  record.timestamps.push(now);
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
