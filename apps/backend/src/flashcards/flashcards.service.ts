import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FlashcardsService {
  constructor(private prisma: PrismaService) {}
  // ── Decks ──

  async createDeck(userId: string, data: { title: string; description?: string }) {
    return this.prisma.flashcardDeck.create({
      data: { userId, title: data.title, description: data.description },
    });
  }

  async findDecks(userId: string) {
    return this.prisma.flashcardDeck.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { cards: true } } },
    });
  }

  async findDeck(id: string, userId: string) {
    const deck = await this.prisma.flashcardDeck.findUnique({
      where: { id },
      include: { cards: { include: { reviews: { orderBy: { reviewedAt: "desc" }, take: 1 } } } },
    });
    if (!deck) throw new NotFoundException("Deck not found");
    if (deck.userId !== userId) throw new ForbiddenException();
    return deck;
  }

  async updateDeck(id: string, userId: string, data: { title?: string; description?: string }) {
    await this.findDeck(id, userId);
    return this.prisma.flashcardDeck.update({ where: { id }, data });
  }

  async deleteDeck(id: string, userId: string) {
    await this.findDeck(id, userId);
    return this.prisma.flashcardDeck.delete({ where: { id } });
  }

  // ── Cards ──

  async createCard(deckId: string, userId: string, data: { front: string; back: string }) {
    await this.findDeck(deckId, userId);
    return this.prisma.flashcard.create({
      data: { deckId, front: data.front, back: data.back },
    });
  }

  async updateCard(id: string, userId: string, data: { front?: string; back?: string }) {
    const card = await this.prisma.flashcard.findUnique({ where: { id }, include: { deck: true } });
    if (!card) throw new NotFoundException("Card not found");
    if (card.deck.userId !== userId) throw new ForbiddenException();
    return this.prisma.flashcard.update({ where: { id }, data });
  }

  async deleteCard(id: string, userId: string) {
    const card = await this.prisma.flashcard.findUnique({ where: { id }, include: { deck: true } });
    if (!card) throw new NotFoundException("Card not found");
    if (card.deck.userId !== userId) throw new ForbiddenException();
    return this.prisma.flashcard.delete({ where: { id } });
  }

  // ── Reviews (SM-2 Algorithm) ──

  async reviewCard(cardId: string, userId: string, quality: number) {
    const card = await this.prisma.flashcard.findUnique({ where: { id: cardId }, include: { deck: true } });
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
