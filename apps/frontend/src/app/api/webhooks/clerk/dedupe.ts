/**
 * Per-process Svix delivery dedupe. Svix retries failed deliveries; a delivery
 * id is remembered only *after* its handler succeeds, so a retry of a failed
 * delivery is never swallowed. Exact-once across replicas or restarts is
 * intentionally out of scope: the handler itself is idempotent (find-first
 * upserts), so a duplicate that slips past the window is harmless.
 */
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 1_000;

const seenDeliveries = new Map<string, number>();

export function isDuplicateDelivery(svixId: string): boolean {
  const at = seenDeliveries.get(svixId);
  return at !== undefined && Date.now() - at < DEDUPE_WINDOW_MS;
}

export function rememberDelivery(svixId: string): void {
  const now = Date.now();
  if (seenDeliveries.size >= MAX_ENTRIES) {
    for (const [id, at] of seenDeliveries) {
      if (now - at >= DEDUPE_WINDOW_MS) seenDeliveries.delete(id);
    }
  }
  seenDeliveries.set(svixId, now);
}
