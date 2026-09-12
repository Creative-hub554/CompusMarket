import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { QuizzesService } from "./quizzes.service";
import { CurrentUserId } from "../common/current-user.decorator";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { UpdateQuizDto } from "./dto/update-quiz.dto";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";

@Controller("quizzes")
@UseGuards(AuthGuard("jwt"))
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() body: CreateQuizDto) {
    return this.quizzesService.create(userId, body);
  }

  @Get()
  findAll(@CurrentUserId() userId: string) {
    return this.quizzesService.findByUser(userId);
  }

  @Get(":id")
  findOne(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.quizzesService.findOne(id, userId);
  }

  @Patch(":id")
  update(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: UpdateQuizDto) {
    return this.quizzesService.update(id, userId, body);
  }

  @Delete(":id")
  remove(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.quizzesService.remove(id, userId);
  }

  // Questions
  @Post(":quizId/questions")
  addQuestion(@CurrentUserId() userId: string, @Param("quizId") quizId: string, @Body() body: CreateQuestionDto) {
    return this.quizzesService.addQuestion(quizId, userId, body);
  }

  @Patch("questions/:id")
  updateQuestion(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: UpdateQuestionDto) {
    return this.quizzesService.updateQuestion(id, userId, body);
  }

  @Delete("questions/:id")
  deleteQuestion(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.quizzesService.deleteQuestion(id, userId);
  }

  // Attempts
  @Post(":quizId/attempts")
  startAttempt(@CurrentUserId() userId: string, @Param("quizId") quizId: string) {
    return this.quizzesService.startAttempt(quizId, userId);
  }

  @Post("attempts/:attemptId/answers")
  submitAnswer(@CurrentUserId() userId: string, @Param("attemptId") attemptId: string, @Body() body: SubmitAnswerDto) {
    return this.quizzesService.submitAnswer(attemptId, userId, body);
  }

  @Post("attempts/:attemptId/complete")
  completeAttempt(@CurrentUserId() userId: string, @Param("attemptId") attemptId: string) {
    return this.quizzesService.completeAttempt(attemptId, userId);
  }

  @Get("my/attempts")
  getMyAttempts(@CurrentUserId() userId: string) {
    return this.quizzesService.getMyAttempts(userId);
  }

  @Get(":quizId/attempts")
  getAttempts(@CurrentUserId() userId: string, @Param("quizId") quizId: string) {
    return this.quizzesService.getAttempts(quizId, userId);
  }
}
