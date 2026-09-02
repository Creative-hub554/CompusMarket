import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/apiBase", () => ({
  getApiBase: () => "http://localhost:4000/api",
}));

import { api, fetchApi } from "./api";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchApi retry + timeout", () => {
  it("returns data on first successful fetch", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "1" }]),
    });
    vi.stubGlobal("fetch", mock);

    const result = await api.products.list();
    expect(result).toEqual([{ id: "1" }]);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("retries on network error then succeeds", async () => {
    const mock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "2" }),
      });
    vi.stubGlobal("fetch", mock);

    const result = await api.products.byId("2");
    expect(result).toEqual({ id: "2" });
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    const mock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", mock);

    await expect(api.products.list()).rejects.toThrow("fetch failed");
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it("throws on non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    await expect(api.products.byId("missing")).rejects.toThrow("API error: 404");
  });

  it("does not retry 4xx client errors", async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", mock);

    await expect(api.products.byId("missing")).rejects.toThrow("API error: 404");
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx server errors", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "5" }) });
    vi.stubGlobal("fetch", mock);

    const result = await api.products.byId("5");
    expect(result).toEqual({ id: "5" });
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("aborts on timeout", async () => {
    vi.stubGlobal(
      "AbortController",
      class {
        signal = {};
        abort = vi.fn();
      },
    );
    const mock = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 100);
        }),
    );
    vi.stubGlobal("fetch", mock);

    await expect(
      api.products.list({ timeoutMs: 1 } as never),
    ).rejects.toThrow("timed out");
  });
});

describe("fetchApi caching", () => {
  it("caches GET responses within ttl", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cached: true }),
    });
    vi.stubGlobal("fetch", mock);

    const a = await fetchApi("/categories", { cacheTtlMs: 60_000 });
    const b = await fetchApi("/categories", { cacheTtlMs: 60_000 });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it("does not cache POST requests", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ created: true }),
    });
    vi.stubGlobal("fetch", mock);

    await api.resumes.create({ title: "Test", data: {} }, "tok");
    await api.resumes.create({ title: "Test 2", data: {} }, "tok");
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
