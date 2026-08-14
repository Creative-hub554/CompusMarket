import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { QuizzesService } from "./quizzes.service";
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
  create(@Req() req: { user: { userId: string } }, @Body() body: CreateQuizDto) {
    return this.quizzesService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Req() req: { user: { userId: string } }) {
    return this.quizzesService.findByUser(req.user.userId);
  }

  @Get(":id")
  findOne(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.quizzesService.findOne(id, req.user.userId);
  }

  @Patch(":id")
  update(@Req() req: { user: { userId: string } }, @Param("id") id: string, @Body() body: UpdateQuizDto) {
    return this.quizzesService.update(id, req.user.userId, body);
  }

  @Delete(":id")
  remove(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.quizzesService.remove(id, req.user.userId);
  }

  // Questions
  @Post(":quizId/questions")
  addQuestion(@Req() req: { user: { userId: string } }, @Param("quizId") quizId: string, @Body() body: CreateQuestionDto) {
    return this.quizzesService.addQuestion(quizId, req.user.userId, body);
  }

  @Patch("questions/:id")
  updateQuestion(@Req() req: { user: { userId: string } }, @Param("id") id: string, @Body() body: UpdateQuestionDto) {
    return this.quizzesService.updateQuestion(id, req.user.userId, body);
  }

  @Delete("questions/:id")
  deleteQuestion(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.quizzesService.deleteQuestion(id, req.user.userId);
  }

  // Attempts
  @Post(":quizId/attempts")
  startAttempt(@Req() req: { user: { userId: string } }, @Param("quizId") quizId: string) {
    return this.quizzesService.startAttempt(quizId, req.user.userId);
  }

  @Post("attempts/:attemptId/answers")
  submitAnswer(@Req() req: { user: { userId: string } }, @Param("attemptId") attemptId: string, @Body() body: SubmitAnswerDto) {
    return this.quizzesService.submitAnswer(attemptId, req.user.userId, body);
  }

  @Post("attempts/:attemptId/complete")
  completeAttempt(@Req() req: { user: { userId: string } }, @Param("attemptId") attemptId: string) {
    return this.quizzesService.completeAttempt(attemptId, req.user.userId);
  }

  @Get("my/attempts")
  getMyAttempts(@Req() req: { user: { userId: string } }) {
    return this.quizzesService.getMyAttempts(req.user.userId);
  }

  @Get(":quizId/attempts")
  getAttempts(@Req() req: { user: { userId: string } }, @Param("quizId") quizId: string) {
    return this.quizzesService.getAttempts(quizId, req.user.userId);
  }
}
