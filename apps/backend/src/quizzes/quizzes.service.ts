import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QuestionType } from "@theo/database";

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}
  // ── Quiz CRUD ──

  async create(userId: string, data: { title: string; description?: string; public?: boolean; timeLimit?: number }) {
    return this.prisma.quiz.create({
      data: { userId, title: data.title, description: data.description, public: data.public ?? false, timeLimit: data.timeLimit ?? 0 },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.quiz.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { questions: true, attempts: true } } },
    });
  }

  async findOne(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz.userId !== userId && !quiz.public) throw new ForbiddenException();
    return quiz;
  }

  async update(id: string, userId: string, data: { title?: string; description?: string; public?: boolean; timeLimit?: number }) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz.userId !== userId) throw new ForbiddenException();
    return this.prisma.quiz.update({ where: { id }, data });
  }

  async remove(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz.userId !== userId) throw new ForbiddenException();
    return this.prisma.quiz.delete({ where: { id } });
  }

  // ── Questions ──

  async addQuestion(quizId: string, userId: string, data: {
    type: QuestionType; question: string; options?: string[]; correctAnswer: string; points?: number; order?: number;
  }) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz.userId !== userId) throw new ForbiddenException();
    return this.prisma.quizQuestion.create({
      data: {
        quizId,
        type: data.type,
        question: data.question,
        options: structuredClone(data.options || []),
        correctAnswer: data.correctAnswer,
        points: data.points ?? 1,
        order: data.order ?? 0,
      },
    });
  }

  async updateQuestion(id: string, userId: string, data: {
    type?: QuestionType; question?: string; options?: string[]; correctAnswer?: string; points?: number; order?: number;
  }) {
    const q = await this.prisma.quizQuestion.findUnique({ where: { id }, include: { quiz: true } });
    if (!q) throw new NotFoundException("Question not found");
    if (q.quiz.userId !== userId) throw new ForbiddenException();
    return this.prisma.quizQuestion.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.question !== undefined && { question: data.question }),
        ...(data.options !== undefined && { options: structuredClone(data.options) }),
        ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
        ...(data.points !== undefined && { points: data.points }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async deleteQuestion(id: string, userId: string) {
    const q = await this.prisma.quizQuestion.findUnique({ where: { id }, include: { quiz: true } });
    if (!q) throw new NotFoundException("Question not found");
    if (q.quiz.userId !== userId) throw new ForbiddenException();
    return this.prisma.quizQuestion.delete({ where: { id } });
  }

  // ── Attempts ──

  private sanitizeQuestion<T extends { correctAnswer: string }>(q: T): Omit<T, "correctAnswer"> {
    return Object.fromEntries(
      Object.entries(q).filter(([key]) => key !== "correctAnswer"),
    ) as Omit<T, "correctAnswer">;
  }

  async startAttempt(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, include: { questions: { orderBy: { order: "asc" } } } });
    if (!quiz) throw new NotFoundException("Quiz not found");
    // IDOR protection: only the owner may attempt a private quiz.
    if (!quiz.public && quiz.userId !== userId) throw new ForbiddenException();

    const attempt = await this.prisma.quizAttempt.create({
      data: { quizId, userId },
      include: { quiz: { include: { questions: { orderBy: { order: "asc" } } } } },
    });

    // Never leak the correctAnswer to the client while the attempt is running.
    return {
      ...attempt,
      quiz: attempt.quiz
        ? {
            ...attempt.quiz,
            questions: attempt.quiz.questions.map((q) => this.sanitizeQuestion(q)),
          }
        : attempt.quiz,
    };
  }

  async submitAnswer(attemptId: string, userId: string, data: { questionId: string; answer: string }) {
    const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: attemptId }, include: { quiz: { include: { questions: true } } } });
    if (!attempt) throw new NotFoundException("Attempt not found");
    if (attempt.userId !== userId) throw new ForbiddenException();
    if (attempt.completedAt) throw new BadRequestException("Attempt already completed");

    const question = attempt.quiz.questions.find((q) => q.id === data.questionId);
    if (!question) throw new NotFoundException("Question not found in this quiz");

    const isCorrect = question.correctAnswer.toLowerCase().trim() === data.answer.toLowerCase().trim();
    const existingAnswer = await this.prisma.quizAnswer.findFirst({
      where: { attemptId, questionId: data.questionId },
    });

    if (existingAnswer) {
      return this.prisma.quizAnswer.update({
        where: { id: existingAnswer.id },
        data: { answer: data.answer, isCorrect },
      });
    }

    return this.prisma.quizAnswer.create({
      data: { attemptId, questionId: data.questionId, answer: data.answer, isCorrect },
    });
  }

  async completeAttempt(attemptId: string, userId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true, quiz: { include: { questions: true } } },
    });
    if (!attempt) throw new NotFoundException("Attempt not found");
    if (attempt.userId !== userId) throw new ForbiddenException();
    if (attempt.completedAt) throw new BadRequestException("Already completed");

    const totalPoints = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = attempt.answers.filter((a) => a.isCorrect).reduce((sum, a) => {
      const q = attempt.quiz.questions.find((qq) => qq.id === a.questionId);
      return sum + (q?.points ?? 1);
    }, 0);

    return this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { completedAt: new Date(), score: totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0, totalPoints },
      include: { answers: { include: { question: true } } },
    });
  }

  async getAttempts(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (quiz.userId !== userId) throw new ForbiddenException();
    return this.prisma.quizAttempt.findMany({
      where: { quizId },
      orderBy: { startedAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async getMyAttempts(userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: { quiz: { select: { id: true, title: true } } },
    });
  }
}
