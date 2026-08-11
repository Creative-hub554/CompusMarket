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

  it("create attaches the Authorization Bearer header when a token is provided", async () => {
    fetchMock.mockResolvedValue(okResponse({ id: "p1" }, 201));

    await api.products.create({ name: "Laptop" }, "TOKEN-123");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/products");
    expect(capturedHeaders(init).get("Authorization")).toBe("Bearer TOKEN-123");
  });

  it("update attaches the Authorization Bearer header when a token is provided", async () => {
    fetchMock.mockResolvedValue(okResponse({ id: "p1" }));

    await api.products.update("p1", { price: 200 }, "TOKEN-123");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/products/p1");
    expect(capturedHeaders(init).get("Authorization")).toBe("Bearer TOKEN-123");
  });

  it("does not attach Authorization when no token is provided", async () => {
    fetchMock.mockResolvedValue(okResponse({ id: "p1" }, 201));

    await api.products.create({ name: "Laptop" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(capturedHeaders(init).get("Authorization")).toBeNull();
  });
});
