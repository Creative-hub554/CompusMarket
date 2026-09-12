import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FlashcardsService } from "./flashcards.service";
import { CreateDeckDto } from "./dto/create-deck.dto";
import { UpdateDeckDto } from "./dto/update-deck.dto";
import { CreateCardDto } from "./dto/create-card.dto";
import { UpdateCardDto } from "./dto/update-card.dto";
import { ReviewCardDto } from "./dto/review-card.dto";
import { CurrentUserId } from "../common/current-user.decorator";

@Controller("flashcards")
@UseGuards(AuthGuard("jwt"))
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  // Decks
  @Post("decks")
  createDeck(@CurrentUserId() userId: string, @Body() body: CreateDeckDto) {
    return this.flashcardsService.createDeck(userId, body);
  }

  @Get("decks")
  getDecks(@CurrentUserId() userId: string) {
    return this.flashcardsService.findDecks(userId);
  }

  @Get("decks/:id")
  getDeck(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.flashcardsService.findDeck(id, userId);
  }

  @Patch("decks/:id")
  updateDeck(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: UpdateDeckDto) {
    return this.flashcardsService.updateDeck(id, userId, body);
  }

  @Delete("decks/:id")
  deleteDeck(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.flashcardsService.deleteDeck(id, userId);
  }

  // Cards
  @Post("decks/:deckId/cards")
  createCard(@CurrentUserId() userId: string, @Param("deckId") deckId: string, @Body() body: CreateCardDto) {
    return this.flashcardsService.createCard(deckId, userId, body);
  }

  @Patch("cards/:id")
  updateCard(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: UpdateCardDto) {
    return this.flashcardsService.updateCard(id, userId, body);
  }

  @Delete("cards/:id")
  deleteCard(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.flashcardsService.deleteCard(id, userId);
  }

  // Reviews
  @Post("cards/:id/review")
  reviewCard(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: ReviewCardDto) {
    return this.flashcardsService.reviewCard(id, userId, body.quality);
  }

  @Get("decks/:deckId/due")
  getDueCards(@CurrentUserId() userId: string, @Param("deckId") deckId: string) {
    return this.flashcardsService.getDueCards(deckId, userId);
  }
}
