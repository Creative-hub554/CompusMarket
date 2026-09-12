import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/apiBase", () => ({
  getApiBase: () => "http://localhost:4000/api",
}));

import { api, fetchApi } from "./api";
import { RequestError, ApiError, handleApiError } from "@/lib/apiFetch";

const mockToastError = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: mockToastError },
  Toaster: () => null,
}));

beforeEach(() => {
  vi.restoreAllMocks();
  mockToastError.mockClear();
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
    ).rejects.toThrow(RequestError);
  });

  it("distinguishes RequestError (timeout) from ApiError (status)", async () => {
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

    const err = await api.products.list({ timeoutMs: 1 } as never).then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(RequestError);
    expect((err as RequestError).timedOut).toBe(true);
  });

  it("RequestError is not an ApiError", async () => {
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

    const err = await api.products.list({ timeoutMs: 1 } as never).then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(RequestError);
    expect(err).not.toBeInstanceOf(ApiError);
  });

  it("handleApiError surfaces a toast for 5xx and returns sessionExpired=false", async () => {
    await handleApiError(
      new ApiError(500, "Server error"),
      "do something",
      false,
      false,
    );
    expect(mockToastError).toHaveBeenCalledWith(
      "Server error while do something. Please try again."
    );
  });

  it("handleApiError surfaces a toast for 404", async () => {
    await handleApiError(
      new ApiError(404, "Not found"),
      "react to the post",
      false,
      false,
    );
    expect(mockToastError).toHaveBeenCalledWith(
      "That react to the post isn't available anymore."
    );
  });

  it("handleApiError surfaces a session-expired toast for 401", async () => {
    const result = await handleApiError(
      new ApiError(401, "Unauthorized"),
      "post your update",
      false,
      false,
    );
    expect(result.sessionExpired).toBe(true);
    expect(mockToastError).toHaveBeenCalledWith(
      "Your session expired. Please sign in again to post your update."
    );
  });

  it("handleApiError is quiet for reads (readLike=true)", async () => {
    await handleApiError(
      new ApiError(500, "Server error"),
      "load notifications",
      true,
      false,
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("handleApiError always surfaces 401 even for reads", async () => {
    const result = await handleApiError(
      new ApiError(401, "Unauthorized"),
      "load your feed",
      true,
      false,
    );
    expect(result.sessionExpired).toBe(true);
    expect(mockToastError).toHaveBeenCalledWith(
      "Your session expired. Please sign in again to load your feed."
    );
  });

  it("handleApiError surfaces a RequestError toast for timeouts", async () => {
    await handleApiError(
      new RequestError("Request timed out after 15000ms", true),
      "load more posts",
      false,
      false,
    );
    expect(mockToastError).toHaveBeenCalledWith(
      "Took too long to load more posts. Check your connection and try again."
    );
  });

  it("handleApiError returns retryResult when retryFn succeeds on 5xx", async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true });
    const result = await handleApiError(
      new ApiError(502, "Bad Gateway"),
      "publish your post",
      false,
      false,
      spy,
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.retryResult).toEqual({ ok: true });
  });

  it("handleApiError does not call retryFn for 4xx errors", async () => {
    const spy = vi.fn();
    const result = await handleApiError(
      new ApiError(403, "Forbidden"),
      "follow this user",
      false,
      false,
      spy,
    );
    expect(spy).not.toHaveBeenCalled();
    expect(result.retryResult).toBeUndefined();
  });

  it("handleApiError falls through to toast when retry also fails with 5xx", async () => {
    const spy = vi.fn().mockRejectedValue(new ApiError(503, "Unavailable"));
    const result = await handleApiError(
      new ApiError(500, "Server error"),
      "save your edit",
      false,
      false,
      spy,
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.retryResult).toBeUndefined();
    expect(mockToastError).toHaveBeenCalledWith(
      "Server error while save your edit. Please try again."
    );
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

    await fetchApi("/categories", { method: "POST", body: "{}" });
    await fetchApi("/categories", { method: "POST", body: "{}" });
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
