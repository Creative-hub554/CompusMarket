import { Test, TestingModule } from "@nestjs/testing";
import { CartService } from "./cart.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("CartService", () => {
  let service: CartService;

  const mockPrisma = {
    cart: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    cartItem: {
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CartService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CartService>(CartService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getCart", () => {
    it("creates a cart when none exists", async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);
      mockPrisma.cart.create.mockResolvedValue({ id: "c-1", items: [] });

      const cart = await service.getCart("u-1");

      expect(mockPrisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: "u-1" } }),
      );
      expect(cart.id).toBe("c-1");
    });
  });

  describe("addItem", () => {
    it("creates a cart item when the product is not already present", async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: "c-1",
        items: [],
      });
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p-1", stock: 5 });
      mockPrisma.cartItem.create.mockResolvedValue({ id: "ci-1" });

      await service.addItem("u-1", "p-1", 2);

      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { cartId: "c-1", productId: "p-1", quantity: 2 } }),
      );
    });

    it("throws when the product does not exist", async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: "c-1",
        items: [],
      });
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.addItem("u-1", "missing", 1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("updateItem", () => {
    it("removes the item when quantity drops to zero or below", async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: "c-1",
        items: [{ id: "ci-1", productId: "p-1" }],
      });
      mockPrisma.cartItem.delete.mockResolvedValue({});

      await service.updateItem("u-1", "ci-1", 0);

      expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: "ci-1" } });
    });
  });
});
