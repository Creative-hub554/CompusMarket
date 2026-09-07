import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requireAdminMock = vi.hoisted(() => vi.fn());
const clerkAuthMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkAuthMock,
}));

import { POST as createProduct } from "@/app/api/admin/products/route";
import { PATCH as updateProduct, DELETE as deleteProduct } from "@/app/api/admin/products/[id]/route";

const adminGuard = { ok: true as const, user: { id: "admin-1", role: "ADMIN" } };
const INVENTORY_GUARD = { ok: true as const, user: { id: "inv-1", role: "INVENTORY_MANAGER" } };

function forbidden() {
  return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

function req(url: string, init?: RequestInit) {
  return new NextRequest(`http://localhost${url}`, init);
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(adminGuard);
  clerkAuthMock.mockResolvedValue({ getToken: async () => "clerk-session-jwt" });
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ id: "p1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/admin/products", () => {
  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await createProduct(req("/api/admin/products", { method: "POST", body: "{}" }));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("relays to the backend with the Clerk session token as Bearer, not x-internal-token", async () => {
    const res = await createProduct(
      req("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Laptop", price: 999 }),
      }),
    );

    expect(res.status).toBe(200);
    expect(clerkAuthMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/products");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer clerk-session-jwt");
    expect(headers.get("x-internal-token")).toBeNull();
    expect(JSON.parse(String(init.body))).toEqual({ name: "Laptop", price: 999 });
  });

  it("returns 401 when no Clerk session token is available", async () => {
    clerkAuthMock.mockResolvedValue({ getToken: async () => null });
    const res = await createProduct(req("/api/admin/products", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/products/[id]", () => {
  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await updateProduct(
      req("/api/admin/products/p1", { method: "PATCH", body: "{}" }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows INVENTORY_MANAGER and relays PATCH with the Clerk token", async () => {
    requireAdminMock.mockResolvedValue(INVENTORY_GUARD);
    const res = await updateProduct(
      req("/api/admin/products/p1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: 200 }),
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/products/p1");
    expect(init.method).toBe("PATCH");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer clerk-session-jwt");
    expect(headers.get("x-internal-token")).toBeNull();
  });
});

describe("DELETE /api/admin/products/[id]", () => {
  it("relays DELETE with the Clerk token", async () => {
    const res = await deleteProduct(
      req("/api/admin/products/p1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/products/p1");
    expect(init.method).toBe("DELETE");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer clerk-session-jwt");
    expect(headers.get("x-internal-token")).toBeNull();
  });
});