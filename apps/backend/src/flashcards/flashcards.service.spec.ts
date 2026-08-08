import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { FlashcardsService } from "./flashcards.service";
import { PrismaService } from "../prisma/prisma.service";

describe("FlashcardsService", () => {
  let service: FlashcardsService;

  const deck = {
    id: "deck-1",
    userId: "user-1",
    title: "Vocabulary",
    description: null,
    cards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const card = {
    id: "card-1",
    deckId: "deck-1",
    front: "hello",
    back: "bonjour",
    deck: { userId: "user-1" },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    flashcardDeck: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    flashcard: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    flashcardReview: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FlashcardsService>(FlashcardsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createDeck / findDecks", () => {
    it("creates a deck", async () => {
      mockPrisma.flashcardDeck.create.mockResolvedValue(deck);
      await service.createDeck("user-1", { title: "Vocabulary" });
      expect(mockPrisma.flashcardDeck.create).toHaveBeenCalledWith({
        data: { userId: "user-1", title: "Vocabulary", description: undefined },
      });
    });

    it("lists decks for the user ordered by updatedAt", async () => {
      mockPrisma.flashcardDeck.findMany.mockResolvedValue([deck]);
      await service.findDecks("user-1");
      expect(mockPrisma.flashcardDeck.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { cards: true } } },
      });
    });
  });

  describe("findDeck", () => {
    it("throws NotFoundException when missing", async () => {
      mockPrisma.flashcardDeck.findUnique.mockResolvedValue(null);
      await expect(service.findDeck("deck-1", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException for another user's deck", async () => {
      mockPrisma.flashcardDeck.findUnique.mockResolvedValue({ ...deck, userId: "other-user" });
      await expect(service.findDeck("deck-1", "user-1")).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("returns an owned deck", async () => {
      mockPrisma.flashcardDeck.findUnique.mockResolvedValue(deck);
      await expect(service.findDeck("deck-1", "user-1")).resolves.toEqual(deck);
    });
  });

  describe("createCard / updateCard / deleteCard", () => {
    it("creates a card within an owned deck", async () => {
      mockPrisma.flashcardDeck.findUnique.mockResolvedValue(deck);
      mockPrisma.flashcard.create.mockResolvedValue(card);
      await service.createCard("deck-1", "user-1", { front: "hello", back: "bonjour" });
      expect(mockPrisma.flashcard.create).toHaveBeenCalledWith({
        data: { deckId: "deck-1", front: "hello", back: "bonjour" },
      });
    });

    it("rejects creating a card in another user's deck", async () => {
      mockPrisma.flashcardDeck.findUnique.mockResolvedValue({ ...deck, userId: "other-user" });
      await expect(service.createCard("deck-1", "user-1", { front: "a", back: "b" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("updates only provided card fields", async () => {
      mockPrisma.flashcard.findUnique.mockResolvedValue(card);
      mockPrisma.flashcard.update.mockResolvedValue({ ...card, front: "new" });
      await service.updateCard("card-1", "user-1", { front: "new" });
      expect(mockPrisma.flashcard.update).toHaveBeenCalledWith({ where: { id: "card-1" }, data: { front: "new" } });
    });

    it("deletes an owned card", async () => {
      mockPrisma.flashcard.findUnique.mockResolvedValue(card);
      mockPrisma.flashcard.delete.mockResolvedValue(card);
      await service.deleteCard("card-1", "user-1");
      expect(mockPrisma.flashcard.delete).toHaveBeenCalledWith({ where: { id: "card-1" } });
    });
  });

  describe("reviewCard (SM-2)", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    it("first quality-5 review schedules interval 1 and raises ease", async () => {
      mockPrisma.flashcard.findUnique.mockResolvedValue(card);
      mockPrisma.flashcardReview.findFirst.mockResolvedValue(null);
      mockPrisma.flashcardReview.create.mockResolvedValue({ id: "r-1" });

      const result = await service.reviewCard("card-1", "user-1", 5);
      expect(result.interval).toBe(1);
      expect(result.ease).toBeCloseTo(2.6);
      expect(mockPrisma.flashcardReview.create).toHaveBeenCalledWith({
        data: {
          flashcardId: "card-1",
          userId: "user-1",
          ease: 2.6,
          interval: 1,
          nextReview: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
    });

    it("second quality-5 review with interval 1 moves to interval 6", async () => {
      mockPrisma.flashcard.findUnique.mockResolvedValue(card);
      mockPrisma.flashcardReview.findFirst.mockResolvedValue({ ease: 2.6, interval: 1 });
      mockPrisma.flashcardReview.create.mockResolvedValue({ id: "r-2" });

      const result = await service.reviewCard("card-1", "user-1", 5);
      expect(result.interval).toBe(6);
      expect(result.ease).toBeCloseTo(2.7);
    });

    it("quality 3 with interval 1 moves to interval 6", async () => {
      mockPrisma.flashcard.findUnique.mockResolvedValue(card);
      mockPrisma.flashcardReview.findFirst.mockResolvedValue({ ease: 2.5, interval: 1 });
      mockPrisma.flashcardReview.create.mockResolvedValue({ id: "r-3" });

      const result = await service.reviewCard("card-1", "user-1", 3);
      expect(result.interval).toBe(6);
      expect(result.ease).toBeCloseTo(2.36);
    });

    it("quality below 3 resets the interval to 1", async () => {
      mockPrisma.flashcard.findUnique.mockResolvedValue(card);
      mockPrisma.flashcardReview.findFirst.mockResolvedValue({ ease: 2.7, interval: 6 });
      mockPrisma.flashcardReview.create.mockResolvedValue({ id: "r-4" });

      const result = await service.reviewCard("card-1", "user-1", 2);
      expect(result.interval).toBe(1);
      expect(result.ease).toBeCloseTo(2.38);
    });

    it("scales the interval by ease for later reviews", async () => {
      mockPrisma.flashcard.findUnique.mockResolvedValue(card);
      mockPrisma.flashcardReview.findFirst.mockResolvedValue({ ease: 2.7, interval: 6 });
      mockPrisma.flashcardReview.create.mockResolvedValue({ id: "r-5" });

      const result = await service.reviewCard("card-1", "user-1", 5);
      expect(result.interval).toBe(17); // round(6 * 2.8)
      expect(result.ease).toBeCloseTo(2.8);
    });

    it("never lowers ease below 1.3", async () => {
      mockPrisma.flashcard.findUnique.mockResolvedValue(card);
      mockPrisma.flashcardReview.findFirst.mockResolvedValue({ ease: 1.4, interval: 6 });
      mockPrisma.flashcardReview.create.mockResolvedValue({ id: "r-6" });

      const result = await service.reviewCard("card-1", "user-1", 0);
      expect(result.ease).toBeGreaterThanOrEqual(1.3);
    });
  });
});
