import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { QuizzesService } from "./quizzes.service";
import { PrismaService } from "../prisma/prisma.service";

describe("QuizzesService", () => {
  let service: QuizzesService;

  const quiz = {
    id: "quiz-1",
    userId: "user-1",
    title: "Math",
    description: "Basic math",
    public: false,
    timeLimit: 10,
    questions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    quiz: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    quizQuestion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    quizAttempt: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    quizAnswer: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<QuizzesService>(QuizzesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("defaults public to false and timeLimit to 0", async () => {
      mockPrisma.quiz.create.mockResolvedValue(quiz);
      await service.create("user-1", { title: "Math" });
      expect(mockPrisma.quiz.create).toHaveBeenCalledWith({
        data: { userId: "user-1", title: "Math", description: undefined, public: false, timeLimit: 0 },
      });
    });

    it("passes provided public and timeLimit through", async () => {
      mockPrisma.quiz.create.mockResolvedValue(quiz);
      await service.create("user-1", { title: "Math", description: "d", public: true, timeLimit: 30 });
      expect(mockPrisma.quiz.create).toHaveBeenCalledWith({
        data: { userId: "user-1", title: "Math", description: "d", public: true, timeLimit: 30 },
      });
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when the quiz does not exist", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("denies access to a private quiz owned by someone else", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ ...quiz, userId: "other-user" });
      await expect(service.findOne("quiz-1", "user-1")).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows access to a public quiz owned by someone else", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ ...quiz, userId: "other-user", public: true });
      await expect(service.findOne("quiz-1", "user-1")).resolves.toEqual({
        ...quiz,
        userId: "other-user",
        public: true,
      });
    });
  });

  describe("update", () => {
    it("throws when updating a non-existent quiz", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.update("quiz-1", "user-1", { title: "X" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("rejects updating another user's quiz", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ ...quiz, userId: "other-user" });
      await expect(service.update("quiz-1", "user-1", { title: "X" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("updates an owned quiz", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(quiz);
      mockPrisma.quiz.update.mockResolvedValue({ ...quiz, title: "X" });
      await service.update("quiz-1", "user-1", { title: "X" });
      expect(mockPrisma.quiz.update).toHaveBeenCalledWith({ where: { id: "quiz-1" }, data: { title: "X" } });
    });
  });

  describe("addQuestion", () => {
    it("adds a question with default points and order", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(quiz);
      mockPrisma.quizQuestion.create.mockResolvedValue({ id: "q-1" });
      await service.addQuestion("quiz-1", "user-1", {
        type: "MULTIPLE_CHOICE",
        question: "2+2?",
        correctAnswer: "4",
      });
      expect(mockPrisma.quizQuestion.create).toHaveBeenCalledWith({
        data: {
          quizId: "quiz-1",
          type: "MULTIPLE_CHOICE",
          question: "2+2?",
          options: [],
          correctAnswer: "4",
          points: 1,
          order: 0,
        },
      });
    });

    it("rejects adding a question to another user's quiz", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ ...quiz, userId: "other-user" });
      await expect(
        service.addQuestion("quiz-1", "user-1", { type: "MULTIPLE_CHOICE", question: "?", correctAnswer: "a" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("startAttempt", () => {
    it("throws when the quiz does not exist", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.startAttempt("quiz-1", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates an attempt", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(quiz);
      mockPrisma.quizAttempt.create.mockResolvedValue({ id: "attempt-1" });
      await service.startAttempt("quiz-1", "user-1");
      expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith({
        data: { quizId: "quiz-1", userId: "user-1" },
        include: { quiz: { include: { questions: { orderBy: { order: "asc" } } } } },
      });
    });
  });

  describe("submitAnswer", () => {
    const attempt = {
      id: "attempt-1",
      userId: "user-1",
      completedAt: null,
      quiz: {
        questions: [
          { id: "q-1", correctAnswer: "Paris", points: 1 },
          { id: "q-2", correctAnswer: "4", points: 3 },
        ],
      },
    };

    it("throws when the attempt does not exist", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(null);
      await expect(service.submitAnswer("attempt-1", "user-1", { questionId: "q-1", answer: "x" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws when the attempt belongs to someone else", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue({ ...attempt, userId: "other-user" });
      await expect(service.submitAnswer("attempt-1", "user-1", { questionId: "q-1", answer: "x" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("throws when the attempt is already completed", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue({ ...attempt, completedAt: new Date() });
      await expect(service.submitAnswer("attempt-1", "user-1", { questionId: "q-1", answer: "x" })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("throws when the question is not part of the quiz", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(attempt);
      await expect(service.submitAnswer("attempt-1", "user-1", { questionId: "nope", answer: "x" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("marks answers correct case-insensitively with trimmed values", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(attempt);
      mockPrisma.quizAnswer.findFirst.mockResolvedValue(null);
      mockPrisma.quizAnswer.create.mockResolvedValue({ id: "a-1" });
      await service.submitAnswer("attempt-1", "user-1", { questionId: "q-1", answer: "  paris " });
      expect(mockPrisma.quizAnswer.create).toHaveBeenCalledWith({
        data: { attemptId: "attempt-1", questionId: "q-1", answer: "  paris ", isCorrect: true },
      });
    });

    it("updates an existing answer instead of creating a duplicate", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(attempt);
      mockPrisma.quizAnswer.findFirst.mockResolvedValue({ id: "a-1" });
      mockPrisma.quizAnswer.update.mockResolvedValue({ id: "a-1" });
      await service.submitAnswer("attempt-1", "user-1", { questionId: "q-2", answer: "3" });
      expect(mockPrisma.quizAnswer.update).toHaveBeenCalledWith({
        where: { id: "a-1" },
        data: { answer: "3", isCorrect: false },
      });
    });
  });

  describe("completeAttempt", () => {
    const attempt = {
      id: "attempt-1",
      userId: "user-1",
      completedAt: null,
      answers: [
        { questionId: "q-1", isCorrect: true },
        { questionId: "q-2", isCorrect: false },
      ],
      quiz: {
        questions: [
          { id: "q-1", points: 1 },
          { id: "q-2", points: 3 },
        ],
      },
    };

    it("computes the score as earned points over total points", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(attempt);
      mockPrisma.quizAttempt.update.mockResolvedValue({ id: "attempt-1" });
      await service.completeAttempt("attempt-1", "user-1");
      expect(mockPrisma.quizAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "attempt-1" },
          data: expect.objectContaining({ score: 25, totalPoints: 4 }),
        }),
      );
    });

    it("throws when already completed", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue({ ...attempt, completedAt: new Date() });
      await expect(service.completeAttempt("attempt-1", "user-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("scores zero when the quiz has no questions", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue({
        ...attempt,
        answers: [],
        quiz: { questions: [] },
      });
      mockPrisma.quizAttempt.update.mockResolvedValue({ id: "attempt-1" });
      await service.completeAttempt("attempt-1", "user-1");
      expect(mockPrisma.quizAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ score: 0, totalPoints: 0 }) }),
      );
    });
  });
});
