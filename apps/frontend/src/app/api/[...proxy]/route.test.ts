import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getTokenMock, getApiBaseMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  getApiBaseMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getToken: getTokenMock }));
vi.mock("@/lib/apiBase", () => ({ getApiBase: getApiBaseMock }));

import { GET } from "./route";

describe("API proxy categories path", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the public categories request to the backend", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    getTokenMock.mockResolvedValue(null);
    getApiBaseMock.mockReturnValue("http://backend/api");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([{ id: "c1" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));

    const response = await GET(new NextRequest("http://localhost:3010/api/categories"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "c1" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend/api/categories",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });
});
