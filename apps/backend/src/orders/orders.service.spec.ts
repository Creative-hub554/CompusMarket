import { Test, TestingModule } from "@nestjs/testing";
import { OrdersService } from "./orders.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { OrderStatus } from "@theo/database";

describe("OrdersService", () => {
  let service: OrdersService;

  const mockPrisma = {
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    cartItem: { deleteMany: vi.fn() },
    product: { findUnique: vi.fn(), updateMany: vi.fn() },
    warranty: { create: vi.fn() },
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
});
