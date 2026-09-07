import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTokenMock, prismaMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  prismaMock: {
    sellerProfile: { findUnique: vi.fn() },
    product: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ getToken: getTokenMock }));
vi.mock("@theo/database", () => ({ prisma: prismaMock }));

// Imported after mocks are set up.
import { PATCH } from "./route";

const PROFILE = {
  id: "profile_1",
  userId: "user_1",
  verificationStatus: "APPROVED",
  accountType: "PERSONAL",
};

const OWNED_PRODUCT = {
  id: "product_1",
  sellerId: "profile_1",
  name: "Existing",
  videoUrl: null,
};

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/seller/products/product_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function patchProduct(body: Record<string, unknown>) {
  return PATCH(patchRequest(body), {
    params: Promise.resolve({ id: "product_1" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getTokenMock.mockResolvedValue({ sub: "user_1", role: "SELLER" });
  prismaMock.sellerProfile.findUnique.mockResolvedValue(PROFILE);
  prismaMock.product.findUnique.mockResolvedValue(OWNED_PRODUCT);
  prismaMock.product.update.mockResolvedValue({
    ...OWNED_PRODUCT,
    category: null,
  });
});

describe("PATCH /api/seller/products/[id] price normalization", () => {
  it("writes the price as an exact two-decimal string when present", async () => {
    const res = await patchProduct({ price: "9.99" });
    expect(res.status).toBe(200);
    expect(prismaMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "product_1" },
        data: expect.objectContaining({ price: "9.99" }),
      }),
    );
    const updateCall = prismaMock.product.update.mock.calls[0][0] as {
      data: { price: unknown };
    };
    expect(typeof updateCall.data.price).toBe("string");
  });

  it("leaves price untouched when the body has no price", async () => {
    const res = await patchProduct({ name: "  Renamed  " });
    expect(res.status).toBe(200);
    const updateCall = prismaMock.product.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateCall.data.price).toBeUndefined();
  });
});
