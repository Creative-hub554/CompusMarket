import { Test, TestingModule } from "@nestjs/testing";
import { SiteKnowledgeService, SITE_SECTIONS } from "./site-knowledge";
import { PrismaService } from "../prisma/prisma.service";

describe("SiteKnowledgeService", () => {
  let service: SiteKnowledgeService;

  const mockPrisma = {
    category: { findMany: vi.fn() },
    product: { aggregate: vi.fn() },
    article: { findMany: vi.fn() },
    sellerProfile: { count: vi.fn() },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteKnowledgeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SiteKnowledgeService>(SiteKnowledgeService);
  });

  it("combines static sections with dynamic store facts", async () => {
    mockPrisma.category.findMany.mockResolvedValue([
      { name: "Laptops", _count: { products: 3 } },
    ]);
    mockPrisma.product.aggregate.mockResolvedValue({
      _count: 4,
      _min: { price: 100 },
      _max: { price: 320 },
    });
    mockPrisma.article.findMany.mockResolvedValue([
      { title: "Tech Careers in Cambodia", slug: "tech-careers", category: "career" },
    ]);
    mockPrisma.sellerProfile.count.mockResolvedValue(2);

    const text = await service.build();

    expect(text).toContain(SITE_SECTIONS);
    expect(text).toContain("Laptops (3)");
    expect(text).toContain("$100-$320");
    expect(text).toContain("2 approved seller shop(s)");
    expect(text).toContain('"Tech Careers in Cambodia"');
  });

  it("caches results within the TTL window", async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);
    mockPrisma.product.aggregate.mockResolvedValue({
      _count: 0,
      _min: { price: null },
      _max: { price: null },
    });
    mockPrisma.article.findMany.mockResolvedValue([]);
    mockPrisma.sellerProfile.count.mockResolvedValue(0);

    await service.build();
    await service.build();

    expect(mockPrisma.category.findMany).toHaveBeenCalledTimes(1);
  });

  it("falls back to static sections when the database fails", async () => {
    mockPrisma.category.findMany.mockRejectedValue(new Error("db down"));

    const text = await service.build();

    expect(text).toContain(SITE_SECTIONS);
    expect(text).not.toContain("Laptops");
  });
});
