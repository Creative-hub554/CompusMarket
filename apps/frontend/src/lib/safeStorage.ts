/**
 * Storage-safe access to Web Storage.
 *
 * Direct `localStorage`/`sessionStorage` access throws in real browsers when
 * storage is blocked (Safari private mode, "block all cookies" settings) and
 * inside test environments where Node >= 23's experimental webstorage global
 * shadows jsdom's storage. Every helper here catches those failures and
 * degrades to the documented fallback, so call sites never need their own
 * try/catch — and never crash on mount.
 */

/** Mirrors `Storage.getItem`: null when absent, on failure, or during SSR. */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Storage unavailable (blocked, or shadowed by Node >=23's experimental
    // webstorage in test environments).
    return null;
  }
}

/** Mirrors `Storage.setItem`; returns false when the write failed (storage full or blocked). */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // Storage full or blocked — persistence is best-effort.
    return false;
  }
}

/** Mirrors `Storage.removeItem`; returns false on failure. */
export function safeLocalStorageRemove(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Mirrors `Storage.getItem`: null when absent, on failure, or during SSR. */
export function safeSessionStorageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    // Storage unavailable (blocked, or shadowed by Node >=23's experimental
    // webstorage in test environments).
    return null;
  }
}

/** Mirrors `Storage.setItem`; returns false when the write failed (storage full or blocked). */
export function safeSessionStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    // Storage full or blocked — persistence is best-effort.
    return false;
  }
}

/** Mirrors `Storage.removeItem`; returns false on failure. */
export function safeSessionStorageRemove(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
