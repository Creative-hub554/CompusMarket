export const MAX_LIMIT = 100;

/**
 * Parse a user-supplied `limit` query param into a bounded number.
 * Returns `fallback` for absent, non-numeric, or NaN/Infinity values so a
 * garbage `?limit=abc` can never turn into a Prisma `take: NaN` 500, and clamps
 * to `max` so a client can't request an unbounded dump.
 */
export function parseLimit(raw: string | undefined, fallback = 30, max = MAX_LIMIT): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}
