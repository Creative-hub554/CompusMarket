import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTokenMock, prismaMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  prismaMock: {
    sellerProfile: { findUnique: vi.fn() },
    product: { count: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getToken: getTokenMock }));
vi.mock("@theo/database", () => ({
  prisma: prismaMock,
  ProductCondition: { A: "A", B: "B", C: "C", D: "D" },
}));

// Imported after mocks are set up.
import { POST } from "./route";

function productRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postProduct(price: string | number) {
  return POST(
    productRequest({
      name: "Test product",
      price,
      condition: "A",
      categoryId: "category_1",
      stock: "1",
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getTokenMock.mockResolvedValue({ sub: "user_1", role: "SELLER" });
  prismaMock.sellerProfile.findUnique.mockResolvedValue({
    id: "profile_1",
    userId: "user_1",
    verificationStatus: "APPROVED",
    accountType: "PERSONAL",
  });
  prismaMock.product.count.mockResolvedValue(0);
  prismaMock.product.create.mockResolvedValue({
    id: "product_1",
    category: null,
  });
});

describe("POST /api/products (legacy seller create) price normalization", () => {
  it("writes the price as an exact two-decimal string, not the expanded f64", async () => {
    const res = await postProduct("9.99");
    expect(res.status).toBe(201);
    expect(prismaMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ price: "9.99" }),
      }),
    );
  });

  it("normalizes 99.99 to the exact decimal string '99.99'", async () => {
    const res = await postProduct("99.99");
    expect(res.status).toBe(201);
    const createCall = prismaMock.product.create.mock.calls[0][0] as {
      data: { price: unknown };
    };
    expect(createCall.data.price).toBe("99.99");
    expect(typeof createCall.data.price).toBe("string");
  });

  it("rejects a non-numeric price before any write", async () => {
    const res = await postProduct("not-a-price");
    expect(res.status).toBe(400);
    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });
});
