import { Test, TestingModule } from "@nestjs/testing";
import { ProductsService } from "./products.service";
import { PrismaService } from "../prisma/prisma.service";
import { SearchService } from "../search/search.service";

describe("ProductsService", () => {
  let service: ProductsService;

  const mockSearch = { indexProduct: vi.fn(), removeFromIndex: vi.fn() };
  const mockPrisma = {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
    orderItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    review: {
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SearchService, useValue: mockSearch },
      ],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("filters to ACTIVE products and excludes sold-out when inStock is true", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "ACTIVE", stock: { gt: 0 } },
        }),
      );
    });

    it("includes sold-out products when inStock is not requested", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "ACTIVE" },
        }),
      );
      expect(mockPrisma.product.findMany.mock.calls[0][0].where.stock).toBeUndefined();
    });
  });

  describe("browse", () => {
    it("paginates with defaults and returns the total count", async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1" }]);
      mockPrisma.product.count.mockResolvedValue(25);
      mockPrisma.$transaction.mockResolvedValue([[{ id: "p1" }], 25]);

      const result = await service.browse({});

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "ACTIVE" },
          skip: 0,
          take: 12,
          orderBy: { createdAt: "desc" },
        }),
      );
      expect(mockPrisma.product.count).toHaveBeenCalledWith({ where: { status: "ACTIVE" } });
      expect(result).toEqual({ items: [{ id: "p1" }], total: 25, page: 1, limit: 12 });
    });

    it("filters by category slug and skips to the requested page", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.browse({ category: "phones", page: 3, limit: 24 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "ACTIVE", category: { slug: "phones" } },
          skip: 48,
          take: 24,
        }),
      );
      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: { status: "ACTIVE", category: { slug: "phones" } },
      });
      expect(result.page).toBe(3);
    });

    it("clamps out-of-range page and limit values", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.browse({ page: -5, limit: 5000 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 48 }),
      );
    });
  });

  describe("findByCategory", () => {
    it("adds a stock filter when inStock is true", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findByCategory("phones", true);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: { slug: "phones" }, status: "ACTIVE", stock: { gt: 0 } },
        }),
      );
    });
  });

  describe("getReviewable", () => {
    it("returns only purchased order items without an existing review", async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([
        { id: "oi1", createdAt: new Date(), feedback: null },
        { id: "oi2", createdAt: new Date(), feedback: { id: "r1" } },
      ]);

      const result = await service.getReviewable("p1", "u1");

      expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: "p1", order: { userId: "u1" } },
        }),
      );
      expect(result).toEqual([{ orderItemId: "oi1", createdAt: expect.any(Date) }]);
    });
  });

  describe("createReview", () => {
    it("creates a review for a valid purchased order item", async () => {
      mockPrisma.orderItem.findFirst.mockResolvedValue({
        id: "oi1",
        feedback: null,
      });
      mockPrisma.review.create.mockResolvedValue({ id: "r1" });

      const result = await service.createReview("p1", "u1", {
        orderItemId: "oi1",
        rating: 5,
        comment: "great",
      });

      expect(mockPrisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            productId: "p1",
            userId: "u1",
            orderItemId: "oi1",
            rating: 5,
            comment: "great",
            images: [],
          },
        }),
      );
      expect(result).toEqual({ id: "r1" });
    });

    it("throws when the order item is not a purchased item for this user", async () => {
      mockPrisma.orderItem.findFirst.mockResolvedValue(null);

      await expect(
        service.createReview("p1", "u1", { orderItemId: "oiX", rating: 4 }),
      ).rejects.toThrow();
    });

    it("throws when the purchase was already reviewed", async () => {
      mockPrisma.orderItem.findFirst.mockResolvedValue({
        id: "oi1",
        feedback: { id: "r1" },
      });

      await expect(
        service.createReview("p1", "u1", { orderItemId: "oi1", rating: 4 }),
      ).rejects.toThrow();
    });
  });
});
