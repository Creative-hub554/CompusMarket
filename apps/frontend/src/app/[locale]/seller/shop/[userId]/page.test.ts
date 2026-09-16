import { describe, expect, it, vi } from "vitest";

const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("@theo/database", () => ({
  prisma: { sellerProfile: { findFirst: findFirstMock } },
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

import {
  getPublicSellerStorefront,
  getSellerDisplayName,
} from "@/components/seller/SellerStorefront";

describe("public seller storefront", () => {
  it("resolves a valid canonical username with the approved public contract", async () => {
    findFirstMock.mockResolvedValue({ user: { name: "Dara" }, products: [] });

    await getPublicSellerStorefront({ username: "dara_shop" });

    expect(findFirstMock).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        user: { username: "dara_shop" },
        verificationStatus: "APPROVED",
      },
      include: expect.objectContaining({
        user: { select: { name: true } },
        products: expect.objectContaining({
          where: {
            status: "ACTIVE",
            seller: { verificationStatus: "APPROVED" },
          },
        }),
      }),
    }));
  });

  it.each([
    ["unknown username", { username: "missing" }],
    ["unapproved seller", { username: "pending_shop" }],
  ])("returns no public storefront for a %s", async (_label, identity) => {
    findFirstMock.mockResolvedValue(null);
    await expect(getPublicSellerStorefront(identity)).resolves.toBeNull();
  });

  it("resolves the legacy user-ID identity through the same loader", async () => {
    findFirstMock.mockResolvedValue({ user: { name: "Dara" }, products: [] });

    await getPublicSellerStorefront({ userId: "user_1" });

    expect(findFirstMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user_1", verificationStatus: "APPROVED" },
    }));
  });

  it("uses a safe fallback when the display name is missing", () => {
    expect(getSellerDisplayName(null)).toBe("Seller");
    expect(getSellerDisplayName("   ")).toBe("Seller");
    expect(getSellerDisplayName(null)).not.toContain("@");
  });
});
