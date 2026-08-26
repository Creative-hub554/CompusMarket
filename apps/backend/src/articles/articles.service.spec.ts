import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ArticlesService } from "./articles.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ArticlesService", () => {
  let service: ArticlesService;

  const mockPrisma = {
    article: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ArticlesService>(ArticlesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates an article and defaults tags to an empty array", async () => {
      mockPrisma.article.create.mockResolvedValue({ id: "a1" });

      await service.create({
        title: "Hello",
        slug: "hello",
        content: "World",
        category: "TECH",
        authorId: "u1",
      });

      expect(mockPrisma.article.create).toHaveBeenCalledWith({
        data: {
          title: "Hello",
          slug: "hello",
          content: "World",
          category: "TECH",
          authorId: "u1",
          tags: [],
        },
      });
    });

    it("passes explicit tags through", async () => {
      mockPrisma.article.create.mockResolvedValue({ id: "a1" });

      await service.create({
        title: "Hello",
        slug: "hello",
        content: "World",
        category: "TECH",
        tags: ["khmer", "news"],
        authorId: "u1",
      });

      expect(mockPrisma.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tags: ["khmer", "news"] }),
      });
    });
  });

  describe("findAllPublished", () => {
    it("only returns published articles, newest first", async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);

      await service.findAllPublished();

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });
  });

  describe("findAll", () => {
    it("includes the author name", async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
        take: 100,
      });
    });
  });

  describe("findBySlug", () => {
    it("returns the article with its author name", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1", slug: "hello" });

      const result = await service.findBySlug("hello");

      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { slug: "hello" },
        include: { author: { select: { name: true } } },
      });
      expect(result).toEqual({ id: "a1", slug: "hello" });
    });

    it("throws NotFound for an unknown slug", async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug("nope")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("findByCategory", () => {
    it("filters to published articles of the category", async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);

      await service.findByCategory("TECH");

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith({
        where: { published: true, category: "TECH" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });
  });

  describe("update", () => {
    it("throws NotFound when the article does not exist", async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(service.update("missing", { title: "New" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrisma.article.update).not.toHaveBeenCalled();
    });

    it("updates only the provided fields", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1" });
      mockPrisma.article.update.mockResolvedValue({ id: "a1", title: "New" });

      const result = await service.update("a1", { title: "New", published: true });

      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { title: "New", published: true },
      });
      expect(result.title).toBe("New");
    });
  });
});
