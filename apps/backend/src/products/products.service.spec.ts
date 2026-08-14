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
});
