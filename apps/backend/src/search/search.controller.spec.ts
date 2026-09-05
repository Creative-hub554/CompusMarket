import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

describe("SearchController", () => {
  let controller: SearchController;
  const mockSearch = { search: vi.fn(), reindexAll: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: mockSearch }],
    }).compile();
    controller = module.get<SearchController>(SearchController);
  });

  it("forwards valid minPrice/maxPrice to the service", async () => {
    mockSearch.search.mockResolvedValue({ hits: [], total: 0 });

    await controller.search("laptop", undefined, "10", "100", undefined);

    expect(mockSearch.search).toHaveBeenCalledWith("laptop", {
      categoryId: undefined,
      minPrice: 10,
      maxPrice: 100,
      condition: undefined,
      sort: undefined,
      inStock: false,
    });
  });

  it("treats absent prices as undefined", async () => {
    mockSearch.search.mockResolvedValue({ hits: [], total: 0 });

    await controller.search("laptop", undefined, undefined, undefined, undefined);

    expect(mockSearch.search).toHaveBeenCalledWith("laptop", {
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      condition: undefined,
      sort: undefined,
      inStock: false,
    });
  });

  it("forwards sort and inStock to the service", async () => {
    mockSearch.search.mockResolvedValue({ hits: [], total: 0 });

    await controller.search("laptop", undefined, undefined, undefined, undefined, "price_asc", "true");

    expect(mockSearch.search).toHaveBeenCalledWith("laptop", {
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      condition: undefined,
      sort: "price_asc",
      inStock: true,
    });
  });

  it("rejects a non-numeric minPrice with 400", async () => {
    await expect(controller.search("laptop", undefined, "abc", undefined, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockSearch.search).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric maxPrice with 400", async () => {
    await expect(controller.search("laptop", undefined, undefined, "1e", undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockSearch.search).not.toHaveBeenCalled();
  });

  it("rejects Infinity/NaN prices with 400", async () => {
    await expect(controller.search("laptop", undefined, "Infinity", undefined, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.search("laptop", undefined, undefined, "NaN", undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockSearch.search).not.toHaveBeenCalled();
  });
});
