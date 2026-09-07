import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/services/api";

describe("api.products", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function okResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function capturedHeaders(init: RequestInit | undefined): Headers {
    return new Headers(init?.headers);
  }

  it("create posts to the admin-local route without an Authorization header", async () => {
    fetchMock.mockResolvedValue(okResponse({ id: "p1" }, 201));

    await api.products.create({ name: "Laptop" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/products");
    expect(init?.method).toBe("POST");
    expect(capturedHeaders(init).get("Authorization")).toBeNull();
  });

  it("update patches the admin-local route without an Authorization header", async () => {
    fetchMock.mockResolvedValue(okResponse({ id: "p1" }));

    await api.products.update("p1", { price: 200 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/products/p1");
    expect(init?.method).toBe("PATCH");
    expect(capturedHeaders(init).get("Authorization")).toBeNull();
  });

  it("delete hits the admin-local route without an Authorization header", async () => {
    fetchMock.mockResolvedValue(okResponse({ success: true }));

    await api.products.delete("p1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/products/p1");
    expect(init?.method).toBe("DELETE");
    expect(capturedHeaders(init).get("Authorization")).toBeNull();
  });

  it("throws when the admin-local route returns a non-ok status", async () => {
    fetchMock.mockResolvedValue(okResponse({ error: "Forbidden" }, 403));

    await expect(api.products.create({ name: "Laptop" })).rejects.toThrow(
      "API error: 403",
    );
  });
});