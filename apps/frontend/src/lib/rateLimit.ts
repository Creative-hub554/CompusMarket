// Simple in-memory sliding-window rate limiter.
// Per-process only (adequate for the auth endpoints in a single Next.js instance).
const buckets = new Map<string, number[]>();
const WINDOW_MS = 60_000;

function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}

/**
 * Returns true when the request is allowed, false when it exceeds the limit.
 * Counts up to `limit` requests per client IP within a rolling 60s window.
 */
export function rateLimit(headers: Headers, limit: number): boolean {
  const key = getClientIp(headers);
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = (buckets.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  // Opportunistic cleanup to keep the map bounded.
  if (buckets.size > 10_000) {
    for (const [k, ts] of buckets) {
      if (ts[ts.length - 1] <= windowStart) buckets.delete(k);
    }
  }

  return true;
}