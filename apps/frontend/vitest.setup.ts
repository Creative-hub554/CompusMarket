import "@testing-library/jest-dom/vitest";

// Node >= 23 ships an experimental `localStorage` global whose getter returns
// undefined unless --localstorage-file is passed. It shadows jsdom's own
// `localStorage`/`sessionStorage` accessors inside the jsdom test environment
// (the underlying jsdom Storage objects still exist at window._localStorage),
// so any component reading localStorage on mount crashes. CI never saw this
// because it pins Node 22, where the global does not exist. Re-publish jsdom's
// real storage objects onto the global when Node's shadow is in the way; on
// Node 22 (or when no shadow is present) this is a no-op.
if (typeof globalThis.localStorage === "undefined" && typeof window !== "undefined") {
  const storage = (window as unknown as { _localStorage?: Storage })._localStorage;
  const session = (window as unknown as { _sessionStorage?: Storage })._sessionStorage;
  if (storage) Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  if (session) Object.defineProperty(globalThis, "sessionStorage", { value: session, configurable: true, writable: true });
}
