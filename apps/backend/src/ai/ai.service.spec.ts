import { Test, TestingModule } from "@nestjs/testing";
import { AiService } from "./ai.service";
import { PrismaService } from "../prisma/prisma.service";

vi.mock("openai", () => ({
  default: class {
    constructor() {}
  },
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
}));

const mockOpenAI = vi.hoisted(() => ({
  create: vi.fn(),
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
}));

vi.mock("openai", () => mockOpenAI);

describe("AiService", () => {
  let service: AiService;

  const mockPrisma = {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateAssistantResponse", () => {
    it("returns a mock response when AI is not available", () => {
      const result = service.generateAssistantResponse("hello", "en");
      expect(result).toBe("I'm having trouble connecting to the AI service right now. Please try again later.");
    });

    it("returns AI response when available", async () => {
      const mockResponse = {
        choices: [{ message: { content: "Hello there! How can I help you?" } }],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      const originalClient = service['client'];
      service['client'] = { chat: { completions: { create: vi.fn() } } } as any;
      (service['client'] as any).chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateAssistantResponse("hello", "en");
      expect(result).toBe("Hello there! How can I help you?");

      service['client'] = originalClient;
    });
  });

  describe("extractSearchSpec", () => {
    it("returns null when AI is not available", async () => {
      const result = await service.extractSearchSpec("laptop under $300", "en");
      expect(result).toBeNull();
    });

    it("extracts search spec when available", async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"query": "laptop", "maxPrice": 300}',
          },
        }],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      const originalClient = service['client'];
      service['client'] = { chat: { completions: { create: vi.fn() } } } as any;
      (service['client'] as any).chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractSearchSpec("laptop under $300", "en");
      expect(result).toEqual({
        query: "laptop",
        maxPrice: 300,
      });

      service['client'] = originalClient;
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
      const mockResponse = {
        choices: [{
          message: {
            content: '{"needsResume": false, "extractedSkills": ["python", "web development"], "extractedTargetRoles": ["backend developer"], "message": "I found some tech roles for you."}',
          },
        }],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      const originalClient = service['client'];
      service['client'] = { chat: { completions: { create: vi.fn() } } } as any;
      (service['client'] as any).chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractCareerMatch("I have python and web development skills", "en");
      expect(result).toEqual({
        needsResume: false,
        extractedSkills: ["python", "web development"],
        extractedTargetRoles: ["backend developer"],
        message: "I found some tech roles for you.",
      });

      service['client'] = originalClient;
    });
  });
});
