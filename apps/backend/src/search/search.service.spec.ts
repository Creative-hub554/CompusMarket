import { Test, TestingModule } from "@nestjs/testing";
import { SearchService } from "./search.service";
import { PrismaService } from "../prisma/prisma.service";

const h = vi.hoisted(() => ({
  mockIndex: {
    updateFilterableAttributes: vi.fn(),
    updateSearchableAttributes: vi.fn(),
    addDocuments: vi.fn(),
    deleteDocument: vi.fn(),
    search: vi.fn(),
  },
}));

vi.mock("meilisearch", () => ({
  Meilisearch: class {
    constructor(public opts: { host: string; apiKey?: string }) {}
    getIndexes = vi.fn();
    createIndex = vi.fn();
    deleteIndex = vi.fn();
    index = vi.fn(() => h.mockIndex);
  },
}));

describe("SearchService", () => {
  let service: SearchService;

  const mockPrisma = {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SearchService>(SearchService);
    await service.onModuleInit();
  });

  type MockClient = {
    getIndexes: ReturnType<typeof vi.fn>;
    createIndex: ReturnType<typeof vi.fn>;
    deleteIndex: ReturnType<typeof vi.fn>;
    index: ReturnType<typeof vi.fn>;
  };

  function client(): MockClient {
    return (service as unknown as { client: MockClient }).client;
  }

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("ensureIndex", () => {
    it("does nothing when the index exists with a primary key", async () => {
      client().getIndexes.mockResolvedValue({
        results: [{ uid: "products", primaryKey: "id" }],
      });
      await service.ensureIndex();
      expect(client().createIndex).not.toHaveBeenCalled();
      expect(client().deleteIndex).not.toHaveBeenCalled();
    });

    it("creates the index when it does not exist", async () => {
      client().getIndexes.mockResolvedValue({ results: [] });
      await service.ensureIndex();
      expect(client().createIndex).toHaveBeenCalledWith("products", { primaryKey: "id" });
      expect(h.mockIndex.updateFilterableAttributes).toHaveBeenCalled();
      expect(h.mockIndex.updateSearchableAttributes).toHaveBeenCalled();
    });

    it("recreates an existing index that has no primary key", async () => {
      client().getIndexes.mockResolvedValue({
        results: [{ uid: "products", primaryKey: null }],
      });
      await service.ensureIndex();
      expect(client().deleteIndex).toHaveBeenCalledWith("products");
      expect(client().createIndex).toHaveBeenCalledWith("products", { primaryKey: "id" });
    });
  });

  describe("indexProduct", () => {
    it("ensures the index before adding the document", async () => {
      client().getIndexes.mockResolvedValue({ results: [] });
      mockPrisma.product.findUnique.mockResolvedValue({
        id: "p-1",
        name: "Watch",
        description: "d",
        price: 10,
        condition: "A",
        status: "ACTIVE",
        categoryId: "c-1",
        images: [],
        createdAt: new Date("2026-01-01"),
        category: { name: "Watches" },
      });

      await service.indexProduct("p-1");

      expect(client().createIndex).toHaveBeenCalledWith("products", { primaryKey: "id" });
      expect(h.mockIndex.addDocuments).toHaveBeenCalledWith([
        expect.objectContaining({ id: "p-1", name: "Watch", categoryName: "Watches" }),
      ]);
    });
  });

  describe("removeFromIndex", () => {
    it("deletes the document by id", async () => {
      client().getIndexes.mockResolvedValue({
        results: [{ uid: "products", primaryKey: "id" }],
      });
      await service.removeFromIndex("p-1");
      expect(h.mockIndex.deleteDocument).toHaveBeenCalledWith("p-1");
    });
  });
});
