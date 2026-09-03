import { Test, TestingModule } from "@nestjs/testing";
import { CartService } from "./cart.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

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
      upsert: vi.fn(),
      findUnique: vi.fn(),
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
    it("upserts a new cart line when the product is not already present", async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: "c-1",
        items: [],
      });
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p-1", stock: 5, status: "ACTIVE" });
      mockPrisma.cartItem.findUnique.mockResolvedValue({ id: "ci-1", productId: "p-1" });

      const res = await service.addItem("u-1", "p-1", 2);

      expect(mockPrisma.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cartId_productId: { cartId: "c-1", productId: "p-1" } },
          create: expect.objectContaining({ cartId: "c-1", productId: "p-1", quantity: 2 }),
          update: expect.objectContaining({ quantity: 2 }),
        })
      );
      expect(res).toEqual({ id: "ci-1", productId: "p-1" });
    });

    it("caps the line quantity at the available stock", async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: "c-1",
        items: [],
      });
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p-1", stock: 2, status: "ACTIVE" });
      mockPrisma.cartItem.findUnique.mockResolvedValue({ id: "ci-1", productId: "p-1" });

      await service.addItem("u-1", "p-1", 5);

      expect(mockPrisma.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ quantity: 2 }),
        })
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

    it("rejects an inactive product", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p-1", status: "DISABLED" });

      await expect(service.addItem("u-1", "p-1", 1)).rejects.toBeInstanceOf(BadRequestException);
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
