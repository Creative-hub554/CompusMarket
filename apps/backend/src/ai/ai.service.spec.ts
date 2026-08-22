import { Test, TestingModule } from "@nestjs/testing";
import { AiService } from "./ai.service";
import { SearchService } from "../search/search.service";
import { ArticlesService } from "../articles/articles.service";
import { SiteKnowledgeService } from "./site-knowledge";

const mockOpenAI = vi.hoisted(() => ({
  default: class {
    chat = { completions: { create: vi.fn() } };
  },
}));

vi.mock("openai", () => mockOpenAI);

describe("AiService", () => {
  let service: AiService;

  const mockSearchService = {
    search: vi.fn(),
  };

  const mockArticlesService = {
    findAllPublished: vi.fn().mockResolvedValue([]),
  };

  const mockSiteKnowledge = {
    build: vi.fn().mockResolvedValue("SITE MAP:\n- /market — seller shops"),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSiteKnowledge.build.mockResolvedValue("SITE MAP:\n- /market — seller shops");
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: SearchService, useValue: mockSearchService },
        { provide: ArticlesService, useValue: mockArticlesService },
        { provide: SiteKnowledgeService, useValue: mockSiteKnowledge },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  function withAvailableClient(mockResponse: unknown) {
    const originalClient = service["client"];
    service["client"] = {
      chat: {
        completions: { create: vi.fn().mockResolvedValue(mockResponse) },
      },
    } as unknown as OpenAIClientStub;
    return () => {
      service["client"] = originalClient;
    };
  }

  type OpenAIClientStub = { chat: { completions: { create: ReturnType<typeof vi.fn> } } };

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateAssistantResponse", () => {
    it("returns a mock response when AI is not available", async () => {
      const result = await service.generateAssistantResponse("hello", "en");
      expect(result).toBe("I'm having trouble connecting to the AI service right now. Please try again later.");
    });

    it("returns AI response when available", async () => {
      const restore = withAvailableClient({
        choices: [{ message: { content: "Hello there! How can I help you?" } }],
      });

      const result = await service.generateAssistantResponse("hello", "en");
      expect(result).toBe("Hello there! How can I help you?");

      restore();
    });
  });

  describe("extractSearchSpec", () => {
    it("returns null when AI is not available", async () => {
      const result = await service.extractSearchSpec("laptop under $300", "en");
      expect(result).toBeNull();
    });

    it("extracts search spec when available", async () => {
      const restore = withAvailableClient({
        choices: [
          {
            message: {
              content: '{"query": "laptop", "maxPrice": 300}',
            },
          },
        ],
      });

      const result = await service.extractSearchSpec("laptop under $300", "en");
      expect(result).toEqual({
        query: "laptop",
        maxPrice: 300,
      });

      restore();
    });
  });

  describe("findProducts", () => {
    it("returns mapped products from the search service", async () => {
      mockSearchService.search.mockResolvedValue({
        hits: [
          {
            id: "p1",
            name: "Dell Laptop",
            price: 250,
            condition: "B",
            categoryName: "Laptops",
            images: ["http://img/dell.jpg"],
          },
        ],
      });

      const products = await service.findProducts({ query: "laptop", maxPrice: 300 });
      expect(mockSearchService.search).toHaveBeenCalledWith("laptop", { maxPrice: 300 });
      expect(products).toEqual([
        {
          id: "p1",
          name: "Dell Laptop",
          price: 250,
          condition: "B",
          categoryName: "Laptops",
          image: "http://img/dell.jpg",
        },
      ]);
    });

    it("passes condition filter through to search", async () => {
      mockSearchService.search.mockResolvedValue({ hits: [] });

      await service.findProducts({ query: "phone", condition: "A" });
      expect(mockSearchService.search).toHaveBeenCalledWith("phone", { condition: "A" });
    });

    it("returns empty array when query is missing", async () => {
      const products = await service.findProducts({ maxPrice: 100 });
      expect(products).toEqual([]);
      expect(mockSearchService.search).not.toHaveBeenCalled();
    });
  });

  describe("generateGuideResponse", () => {
    it("returns fallback with no links when AI is not available", async () => {
      const result = await service.generateGuideResponse("what can I do here?", "en");
      expect(result.reply).toBe("I'm having trouble connecting to the AI service right now. Please try again later.");
      expect(result.links).toEqual([]);
    });

    it("returns guide reply and extracts section links", async () => {
      const restore = withAvailableClient({
        choices: [
          {
            message: {
              content:
                "You can browse seller shops at /market or find items in /shop. To sell, start at /seller/apply.",
            },
          },
        ],
      });

      const result = await service.generateGuideResponse("how do I sell?", "en");
      expect(result.reply).toContain("/market");
      expect(result.links).toEqual(["/market", "/shop", "/seller/apply"]);

      restore();
    });

    it("includes site knowledge, page context and product data in the prompt", async () => {
      const stub = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: "Here is what you can do." } }],
            }),
          },
        },
      };
      const originalClient = service["client"];
      service["client"] = stub as unknown as OpenAIClientStub;

      await service.generateGuideResponse(
        "gift ideas",
        "km",
        [{ id: "p1", name: "iPhone 12", price: 320, condition: "B" }],
        "/community/careers",
        false,
      );

      const prompt = stub.chat.completions.create.mock.calls[0][0]
        .messages[0].content as string;
      expect(prompt).toContain("SITE MAP");
      expect(prompt).toContain("/community/careers");
      expect(prompt).toContain("iPhone 12");
      expect(prompt).toContain("Khmer");

      service["client"] = originalClient;
    });
  });

  describe("extractCareerMatch", () => {
    it("returns career match with needsResume when AI is not available", async () => {
      const result = await service.extractCareerMatch("I want a job", "en");
      expect(result).toEqual({
        needsResume: true,
        message: "I'm having trouble analyzing your message. Please try again later.",
      });
    });

    it("returns career match when available", async () => {
      const restore = withAvailableClient({
        choices: [
          {
            message: {
              content:
                '{"needsResume": false, "extractedSkills": ["python", "web development"], "extractedTargetRoles": ["backend developer"], "message": "I found some tech roles for you."}',
            },
          },
        ],
      });

      const result = await service.extractCareerMatch("I have python and web development skills", "en");
      expect(result).toEqual({
        needsResume: false,
        extractedSkills: ["python", "web development"],
        extractedTargetRoles: ["backend developer"],
        message: "I found some tech roles for you.",
      });

      restore();
    });
  });
});
