import { afterEach, describe, expect, it } from "vitest";
import {
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
} from "./safeStorage";

const globalScope = globalThis as unknown as Record<string, unknown>;
const originalLocalStorage = globalScope.localStorage;

interface FakeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function makeFakeStorage(overrides: Partial<FakeStorage> = {}): FakeStorage {
  const map = new Map<string, string>();
  const fake: FakeStorage = {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
  return { ...fake, ...overrides };
}

function installLocalStorage(value: unknown) {
  Object.defineProperty(globalScope, "localStorage", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  if (originalLocalStorage === undefined) {
    delete globalScope.localStorage;
  } else {
    installLocalStorage(originalLocalStorage);
  }
});

describe("safeLocalStorage* (Node webstorage gateway)", () => {
  it("returns null/false when webstorage is absent", () => {
    delete globalScope.localStorage;
    expect(safeLocalStorageGet("key")).toBeNull();
    expect(safeLocalStorageSet("key", "value")).toBe(false);
    expect(safeLocalStorageRemove("key")).toBe(false);
  });

  it("treats a malformed global (missing methods) as unavailable", () => {
    installLocalStorage({});
    expect(safeLocalStorageGet("key")).toBeNull();
    expect(safeLocalStorageSet("key", "value")).toBe(false);
    expect(safeLocalStorageRemove("key")).toBe(false);
  });

  it("round-trips values through working storage", () => {
    installLocalStorage(makeFakeStorage());
    expect(safeLocalStorageSet("key", "value")).toBe(true);
    expect(safeLocalStorageGet("key")).toBe("value");
    expect(safeLocalStorageGet("missing")).toBeNull();
    expect(safeLocalStorageSet("key", "updated")).toBe(true);
    expect(safeLocalStorageGet("key")).toBe("updated");
    expect(safeLocalStorageRemove("never-was-there")).toBe(true);
    expect(safeLocalStorageRemove("key")).toBe(true);
    expect(safeLocalStorageGet("key")).toBeNull();
  });

  it("degrades to null/false when storage throws", () => {
    const boom = () => {
      throw new Error("quota exceeded");
    };
    installLocalStorage(makeFakeStorage({ getItem: boom, setItem: boom, removeItem: boom }));
    expect(safeLocalStorageGet("key")).toBeNull();
    expect(safeLocalStorageSet("key", "value")).toBe(false);
    expect(safeLocalStorageRemove("key")).toBe(false);
  });
});
