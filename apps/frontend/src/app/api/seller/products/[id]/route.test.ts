import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTokenMock, prismaMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  prismaMock: {
    sellerProfile: { findUnique: vi.fn() },
    product: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    inventoryMovement: { create: vi.fn() },
    $transaction: vi.fn(),
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
  stock: 1,
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
  prismaMock.$transaction.mockImplementation((callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
  prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.inventoryMovement.create.mockResolvedValue({ id: "movement_1" });
});

describe("PATCH /api/seller/products/[id]", () => {
  it("does not let a seller mutate another seller's product", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ ...OWNED_PRODUCT, sellerId: "other_profile" });

    const res = await patchProduct({ stock: 4, reason: "restock" });

    expect(res.status).toBe(404);
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });

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

  it.each([
    ["missing", undefined],
    ["blank", "   "],
  ])("rejects a %s stock adjustment reason without mutating stock", async (_label, reason) => {
    const res = await patchProduct({ stock: 4, ...(reason === undefined ? {} : { reason }) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "A reason is required when changing stock" });
    expect(prismaMock.product.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it("accepts and trims a bounded stock adjustment reason", async () => {
    const res = await patchProduct({ stock: 4, reason: "  Restocked from supplier  " });
    expect(res.status).toBe(200);
    expect(prismaMock.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reason: "Restocked from supplier" }),
    });
  });

  it("allows a reasoned adjustment down to zero", async () => {
    const res = await patchProduct({ stock: 0, reason: "Sold remaining unit" });
    expect(res.status).toBe(200);
    expect(prismaMock.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { stock: { increment: -1 } },
    }));
  });

  it("rejects an overlong stock adjustment reason without mutating stock", async () => {
    const res = await patchProduct({ stock: 4, reason: "x".repeat(501) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Stock adjustment reason must be 500 characters or fewer",
    });
    expect(prismaMock.product.updateMany).not.toHaveBeenCalled();
  });

  it("does not require a reason or movement when stock is unchanged", async () => {
    const res = await patchProduct({ stock: 1, name: "Renamed" });
    expect(res.status).toBe(200);
    expect(prismaMock.product.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it.each([
    ["negative", -1],
    ["fractional", 1.5],
    ["null", null],
    ["blank", "   "],
  ])("rejects %s stock before any mutation", async (_label, stock) => {
    const res = await patchProduct({ stock, reason: "Correction" });
    expect(res.status).toBe(400);
    expect(prismaMock.product.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it("records an owned stock adjustment with its actor and reason", async () => {
    const res = await patchProduct({ stock: 4, reason: "Restocked from supplier" });
    expect(res.status).toBe(200);
    expect(prismaMock.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "product_1", sellerId: "profile_1" }),
      data: { stock: { increment: 3 } },
    }));
    expect(prismaMock.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: "product_1",
        sellerProfileId: "profile_1",
        actorId: "user_1",
        delta: expect.any(Number),
        reason: "Restocked from supplier",
      }),
    });
  });

  it("persists a non-negative low-stock threshold", async () => {
    const res = await patchProduct({ lowStockThreshold: 2 });
    expect(res.status).toBe(200);
    expect(prismaMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lowStockThreshold: 2 }) }),
    );
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
