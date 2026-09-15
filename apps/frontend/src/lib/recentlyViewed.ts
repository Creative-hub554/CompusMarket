import { safeLocalStorageGet, safeLocalStorageSet } from "./safeStorage";

const KEY = "champey-recently-viewed";
const MAX = 8;

export function getRecentlyViewed(): string[] {
  const raw = safeLocalStorageGet(KEY);
  if (raw === null) return [];
  try {
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) ? ids.filter((i): i is string => typeof i === "string") : [];
  } catch {
    return []; // corrupted stored value — treat as empty
  }
}

export function recordProductView(productId: string): void {
  const ids = getRecentlyViewed().filter((id) => id !== productId);
  safeLocalStorageSet(KEY, JSON.stringify([productId, ...ids].slice(0, MAX)));
}
