import { afterEach, describe, expect, it } from "vitest";
import {
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
  safeSessionStorageGet,
  safeSessionStorageRemove,
  safeSessionStorageSet,
} from "./safeStorage";

const globalScope = globalThis as unknown as Record<string, unknown>;
const originalWindow = globalScope.window;

type MethodOverrides = Partial<{
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}>;

function makeFakeStorage(overrides: MethodOverrides = {}) {
  const map = new Map<string, string>();
  const fake = {
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
  return Object.assign(fake, overrides);
}

function installWindow(overrides?: {
  localStorage?: MethodOverrides;
  sessionStorage?: MethodOverrides;
}) {
  globalScope.window = {
    localStorage: makeFakeStorage(overrides?.localStorage),
    sessionStorage: makeFakeStorage(overrides?.sessionStorage),
  };
}

afterEach(() => {
  if (originalWindow === undefined) {
    delete globalScope.window;
  } else {
    globalScope.window = originalWindow;
  }
});

describe("safeLocalStorage*", () => {
  it("returns null/false when window is absent (SSR)", () => {
    delete globalScope.window;
    expect(safeLocalStorageGet("key")).toBeNull();
    expect(safeLocalStorageSet("key", "value")).toBe(false);
    expect(safeLocalStorageRemove("key")).toBe(false);
  });

  it("round-trips values through working storage", () => {
    installWindow();
    expect(safeLocalStorageSet("theme", "dark")).toBe(true);
    expect(safeLocalStorageGet("theme")).toBe("dark");
    expect(safeLocalStorageGet("missing")).toBeNull();
    expect(safeLocalStorageSet("theme", "light")).toBe(true);
    expect(safeLocalStorageGet("theme")).toBe("light");
    expect(safeLocalStorageRemove("theme")).toBe(true);
    expect(safeLocalStorageGet("theme")).toBeNull();
  });

  it("degrades to null/false when storage throws (blocked)", () => {
    const boom = () => {
      throw new Error("SecurityError: storage is blocked");
    };
    installWindow({ localStorage: { getItem: boom, setItem: boom, removeItem: boom } });
    expect(safeLocalStorageGet("key")).toBeNull();
    expect(safeLocalStorageSet("key", "value")).toBe(false);
    expect(safeLocalStorageRemove("key")).toBe(false);
  });
});

describe("safeSessionStorage*", () => {
  it("returns null/false when window is absent (SSR)", () => {
    delete globalScope.window;
    expect(safeSessionStorageGet("key")).toBeNull();
    expect(safeSessionStorageSet("key", "value")).toBe(false);
    expect(safeSessionStorageRemove("key")).toBe(false);
  });

  it("round-trips values through working storage", () => {
    installWindow();
    expect(safeSessionStorageSet("tab", "a")).toBe(true);
    expect(safeSessionStorageGet("tab")).toBe("a");
    expect(safeSessionStorageGet("missing")).toBeNull();
    expect(safeSessionStorageSet("tab", "b")).toBe(true);
    expect(safeSessionStorageGet("tab")).toBe("b");
    expect(safeSessionStorageRemove("tab")).toBe(true);
    expect(safeSessionStorageGet("tab")).toBeNull();
  });

  it("degrades to null/false when storage throws (blocked)", () => {
    const boom = () => {
      throw new Error("SecurityError: storage is blocked");
    };
    installWindow({ sessionStorage: { getItem: boom, setItem: boom, removeItem: boom } });
    expect(safeSessionStorageGet("key")).toBeNull();
    expect(safeSessionStorageSet("key", "value")).toBe(false);
    expect(safeSessionStorageRemove("key")).toBe(false);
  });
});
