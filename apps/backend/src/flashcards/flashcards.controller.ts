import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FlashcardsService } from "./flashcards.service";

@Controller("flashcards")
@UseGuards(AuthGuard("jwt"))
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  // Decks
  @Post("decks")
  createDeck(@Req() req: { user: { userId: string } }, @Body() body: { title: string; description?: string }) {
    return this.flashcardsService.createDeck(req.user.userId, body);
  }

  @Get("decks")
  getDecks(@Req() req: { user: { userId: string } }) {
    return this.flashcardsService.findDecks(req.user.userId);
  }

  @Get("decks/:id")
  getDeck(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.flashcardsService.findDeck(id, req.user.userId);
  }

  @Patch("decks/:id")
  updateDeck(@Req() req: { user: { userId: string } }, @Param("id") id: string, @Body() body: { title?: string; description?: string }) {
    return this.flashcardsService.updateDeck(id, req.user.userId, body);
  }

  @Delete("decks/:id")
  deleteDeck(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.flashcardsService.deleteDeck(id, req.user.userId);
  }

  // Cards
  @Post("decks/:deckId/cards")
  createCard(@Req() req: { user: { userId: string } }, @Param("deckId") deckId: string, @Body() body: { front: string; back: string }) {
    return this.flashcardsService.createCard(deckId, req.user.userId, body);
  }

  @Patch("cards/:id")
  updateCard(@Req() req: { user: { userId: string } }, @Param("id") id: string, @Body() body: { front?: string; back?: string }) {
    return this.flashcardsService.updateCard(id, req.user.userId, body);
  }

  @Delete("cards/:id")
  deleteCard(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.flashcardsService.deleteCard(id, req.user.userId);
  }

  // Reviews
  @Post("cards/:id/review")
  reviewCard(@Req() req: { user: { userId: string } }, @Param("id") id: string, @Body() body: { quality: number }) {
    return this.flashcardsService.reviewCard(id, req.user.userId, body.quality);
  }

  @Get("decks/:deckId/due")
  getDueCards(@Req() req: { user: { userId: string } }, @Param("deckId") deckId: string) {
    return this.flashcardsService.getDueCards(deckId, req.user.userId);
  }
}
