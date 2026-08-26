import { Test, TestingModule } from "@nestjs/testing";
import { OrdersService } from "./orders.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { OrderStatus, OrderItemStatus } from "@theo/database";

describe("OrdersService", () => {
  let service: OrdersService;

  const mockPrisma = {
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    orderItem: { updateMany: vi.fn() },
    sellerProfile: { findUnique: vi.fn() },
    cart: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    cartItem: { deleteMany: vi.fn() },
    product: { findUnique: vi.fn(), updateMany: vi.fn() },
    warranty: { create: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("checkout", () => {
    const cart = {
      id: "cart-1",
      items: [
        {
          productId: "p1",
          quantity: 2,
          product: { id: "p1", name: "Phone", price: 100, warrantyMonths: 12 },
        },
        {
          productId: "p2",
          quantity: 1,
          product: { id: "p2", name: "Case", price: 10, warrantyMonths: null },
        },
      ],
    };

    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => unknown) => cb(mockPrisma)
      );
    });

    it("throws when the cart is empty", async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.checkout("u-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });

    it("creates the order, batches warranty rows and clears the cart", async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(cart);
      mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.create.mockResolvedValue({
        id: "o-1",
        status: OrderStatus.PENDING,
        items: [
          { id: "oi-1", productId: "p1" },
          { id: "oi-2", productId: "p2" },
        ],
      });
      mockPrisma.warranty.createMany.mockResolvedValue({ count: 1 });

      const result = await service.checkout("u-1");

      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: "p1", stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "u-1", total: 210 }),
        }),
      );
      expect(mockPrisma.warranty.createMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.warranty.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            orderItemId: "oi-1",
            productId: "p1",
            userId: "u-1",
            months: 12,
          }),
        ],
      });
      expect(mockPrisma.warranty.create).not.toHaveBeenCalled();
      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: "cart-1" },
      });
      expect(result.id).toBe("o-1");
    });

    it("rejects without creating anything when stock is insufficient", async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(cart);
      mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.checkout("u-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
      expect(mockPrisma.warranty.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.cartItem.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when the order does not exist", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("updateStatus", () => {
    it("applies a valid transition (PENDING -> PROCESSING)", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-1",
        status: OrderStatus.PENDING,
        userId: "u-1",
        items: [],
      });
      mockPrisma.order.update.mockResolvedValue({ id: "o-1", status: OrderStatus.PROCESSING });

      const result = await service.updateStatus("o-1", OrderStatus.PROCESSING);

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "o-1" }, data: { status: OrderStatus.PROCESSING } }),
      );
      expect(result.status).toBe(OrderStatus.PROCESSING);
    });

    it("rejects an invalid transition (PENDING -> DELIVERED)", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-1",
        status: OrderStatus.PENDING,
        userId: "u-1",
        items: [],
      });

      await expect(service.updateStatus("o-1", OrderStatus.DELIVERED)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it("rejects transitioning a terminal CANCELLED order", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-1",
        status: OrderStatus.CANCELLED,
        userId: "u-1",
        items: [],
      });

      await expect(service.updateStatus("o-1", OrderStatus.PROCESSING)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe("updateSellerStatus", () => {
    it("ships an order the seller owns and marks their items SHIPPED", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-1",
        status: OrderStatus.PROCESSING,
        userId: "buyer-1",
        items: [
          { id: "oi-1", product: { sellerId: "s-1" } },
          { id: "oi-2", product: { sellerId: "s-other" } },
        ],
      });
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({ id: "s-1" });
      mockPrisma.order.update.mockResolvedValue({ id: "o-1", status: OrderStatus.SHIPPED });

      const result = await service.updateSellerStatus("o-1", "seller-user-1", OrderStatus.SHIPPED);

      expect(mockPrisma.orderItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["oi-1"] } },
        data: { status: OrderItemStatus.SHIPPED },
      });
      expect(result.status).toBe(OrderStatus.SHIPPED);
    });

    it("forbids a seller who owns no items in the order", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-1",
        status: OrderStatus.PROCESSING,
        userId: "buyer-1",
        items: [{ id: "oi-1", product: { sellerId: "s-other" } }],
      });
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({ id: "s-1" });

      await expect(
        service.updateSellerStatus("o-1", "seller-user-1", OrderStatus.SHIPPED),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it("forbids a user without a seller profile", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-1",
        status: OrderStatus.PROCESSING,
        userId: "buyer-1",
        items: [{ id: "oi-1", product: { sellerId: "s-1" } }],
      });
      mockPrisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSellerStatus("o-1", "plain-user", OrderStatus.SHIPPED),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects an invalid seller transition", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-1",
        status: OrderStatus.PENDING,
        userId: "buyer-1",
        items: [{ id: "oi-1", product: { sellerId: "s-1" } }],
      });
      mockPrisma.sellerProfile.findUnique.mockResolvedValue({ id: "s-1" });

      await expect(
        service.updateSellerStatus("o-1", "seller-user-1", OrderStatus.DELIVERED),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.orderItem.updateMany).not.toHaveBeenCalled();
    });
  });
});
