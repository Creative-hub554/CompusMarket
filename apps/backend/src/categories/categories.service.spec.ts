import { Test, TestingModule } from "@nestjs/testing";
import { CategoriesService } from "./categories.service";
import { PrismaService } from "../prisma/prisma.service";

describe("CategoriesService", () => {
  let service: CategoriesService;

  const mockPrisma = {
    category: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CategoriesService>(CategoriesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a category with the given name and slug", async () => {
      mockPrisma.category.create.mockResolvedValue({ id: "c1", name: "Phones", slug: "phones" });

      const result = await service.create("Phones", "phones");

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: { name: "Phones", slug: "phones" },
      });
      expect(result.slug).toBe("phones");
    });
  });

  describe("findAll", () => {
    it("includes the product count", async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        { id: "c1", name: "Phones", slug: "phones", _count: { products: 3 } },
      ]);

      const result = await service.findAll();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        include: { _count: { select: { products: true } } },
      });
      expect(result[0]._count.products).toBe(3);
    });
  });

  describe("findOne", () => {
    it("includes the category products", async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: "c1", products: [] });

      await service.findOne("c1");

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: "c1" },
        include: { products: true },
      });
    });
  });

  describe("remove", () => {
    it("deletes by id", async () => {
      mockPrisma.category.delete.mockResolvedValue({ id: "c1" });

      await service.remove("c1");

      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    });
  });

  describe("update", () => {
    it("updates only the provided fields", async () => {
      mockPrisma.category.update.mockResolvedValue({ id: "c1", name: "Phones", slug: "phones" });

      await service.update("c1", { name: "Phones" });

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { name: "Phones" },
      });
    });
  });

  describe("seed", () => {
    it("upserts every default category idempotently", async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const result = await service.seed();

      expect(mockPrisma.category.upsert).toHaveBeenCalledTimes(13);
      expect(mockPrisma.category.upsert).toHaveBeenCalledWith({
        where: { slug: "gaming-pcs" },
        update: {},
        create: { name: "Gaming PCs", slug: "gaming-pcs" },
      });
      expect(mockPrisma.category.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
