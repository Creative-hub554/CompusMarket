const KEY = "champey-recently-viewed";
const MAX = 8;

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((i): i is string => typeof i === "string") : [];
  } catch {
    return [];
  }
}

export function recordProductView(productId: string): void {
  if (typeof window === "undefined") return;
  try {
    const ids = getRecentlyViewed().filter((id) => id !== productId);
    window.localStorage.setItem(KEY, JSON.stringify([productId, ...ids].slice(0, MAX)));
  } catch {
    // Storage full or blocked — recently-viewed is best-effort.
  }
}
