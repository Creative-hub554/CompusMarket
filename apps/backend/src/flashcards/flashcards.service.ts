import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createOwnedResource, type OwnedResource } from "../common/owned-resource";
import type { Flashcard, FlashcardDeck } from "@theo/database";

type CreateDeck = { title: string; description?: string };
type UpdateDeck = { title?: string; description?: string };
type CreateCard = { front: string; back: string };
type UpdateCard = { front?: string; back?: string };

/** A card fetched with its deck, enough to resolve ownership. */
type CardWithDeck = Flashcard & { deck: { userId: string } };

@Injectable()
export class FlashcardsService {
  private readonly decks: OwnedResource<FlashcardDeck, CreateDeck, UpdateDeck>;
  private readonly cards: OwnedResource<CardWithDeck, CreateCard, UpdateCard>;

  constructor(private readonly prisma: PrismaService) {
    this.decks = createOwnedResource<FlashcardDeck, CreateDeck, UpdateDeck>(prisma.flashcardDeck, {
      name: "Deck",
      listInclude: { _count: { select: { cards: true } } },
      findOneInclude: {
        cards: { include: { reviews: { orderBy: { reviewedAt: "desc" }, take: 1 } } },
      },
      buildCreateData: (userId, data) => ({
        userId,
        title: data.title,
        description: data.description,
      }),
    });

    // Cards live under a deck; ownership is resolved through `card.deck.userId`.
    this.cards = createOwnedResource<CardWithDeck, CreateCard, UpdateCard>(prisma.flashcard, {
      name: "Card",
      ownerId: (card) => card.deck.userId,
      findOneInclude: { deck: true },
    });
  }

  // ── Decks ──
  createDeck(userId: string, data: CreateDeck) {
    return this.decks.create(userId, data);
  }

  findDecks(userId: string) {
    return this.decks.findByUser(userId);
  }

  findDeck(id: string, userId: string) {
    return this.decks.findOne(id, userId);
  }

  updateDeck(id: string, userId: string, data: UpdateDeck) {
    return this.decks.update(id, userId, data);
  }

  deleteDeck(id: string, userId: string) {
    return this.decks.remove(id, userId);
  }

  // ── Cards ──
  async createCard(deckId: string, userId: string, data: CreateCard) {
    await this.findDeck(deckId, userId);
    return this.prisma.flashcard.create({
      data: { deckId, front: data.front, back: data.back },
    });
  }

  updateCard(id: string, userId: string, data: UpdateCard) {
    return this.cards.update(id, userId, data);
  }

  deleteCard(id: string, userId: string) {
    return this.cards.remove(id, userId);
  }

  // ── Reviews (SM-2 Algorithm) ──

  async reviewCard(cardId: string, userId: string, quality: number) {
    const card = await this.prisma.flashcard.findUnique({
      where: { id: cardId },
      include: { deck: true },
    });
    if (!card) throw new NotFoundException("Card not found");
    if (card.deck.userId !== userId) throw new ForbiddenException();

    const lastReview = await this.prisma.flashcardReview.findFirst({
      where: { flashcardId: cardId, userId },
      orderBy: { reviewedAt: "desc" },
    });

    let ease = lastReview?.ease ?? 2.5;
    let interval = lastReview?.interval ?? 0;

    // SM-2 algorithm
    const q = Math.max(0, Math.min(5, quality));
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

    if (q < 3) {
      interval = 1;
    } else if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }

    const now = new Date();
    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    const review = await this.prisma.flashcardReview.create({
      data: { flashcardId: cardId, userId, ease, interval, nextReview },
    });

    return { review, ease, interval, nextReview };
  }

  async getDueCards(deckId: string, userId: string) {
    await this.findDeck(deckId, userId);
    const now = new Date();
    return this.prisma.flashcard.findMany({
      where: {
        deckId,
        reviews: {
          none: { nextReview: { gt: now } },
        },
      },
      include: { reviews: { orderBy: { reviewedAt: "desc" }, take: 1 } },
    });
  }
}