/**
 * Storage-safe access to Web Storage (Node >= 23 experimental webstorage).
 *
 * Node 22 exposes webstorage behind a flag and Node >= 23 ships it on by
 * default, but only `localStorage` — `sessionStorage` does not exist. Access
 * can still throw: storage can be disabled at runtime, quota can be exhausted,
 * and CI runs a Node matrix (22 and 26) where availability differs. Every
 * helper here catches those failures and degrades to the documented fallback,
 * so call sites never need their own try/catch.
 *
 * `window` is intentionally not referenced: this file must compile without DOM
 * lib types, so storage is reached through `globalThis` and a minimal
 * structural interface.
 */

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getLocalStorage(): WebStorageLike | undefined {
  // Structural probe: on Node without webstorage the property is absent, and
  // a host object that lacks the methods is treated as unavailable too.
  const candidate = (globalThis as { localStorage?: unknown }).localStorage;
  if (
    candidate !== null &&
    typeof candidate === "object" &&
    typeof (candidate as WebStorageLike).getItem === "function" &&
    typeof (candidate as WebStorageLike).setItem === "function" &&
    typeof (candidate as WebStorageLike).removeItem === "function"
  ) {
    return candidate as WebStorageLike;
  }
  return undefined;
}

/** Mirrors `Storage.getItem`: null when absent, on failure, or when webstorage is unavailable. */
export function safeLocalStorageGet(key: string): string | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Mirrors `Storage.setItem`; returns false when the write failed (quota or unavailable). */
export function safeLocalStorageSet(key: string, value: string): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Mirrors `Storage.removeItem`; returns false on failure. */
export function safeLocalStorageRemove(key: string): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
