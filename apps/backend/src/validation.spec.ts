import { validate } from "class-validator";
import { CreateResumeDto } from "./resumes/dto/create-resume.dto";
import { CreateArticleDto } from "./articles/dto/create-article.dto";
import { CreateQuestionDto } from "./quizzes/dto/create-question.dto";
import { SubmitAnswerDto } from "./quizzes/dto/submit-answer.dto";
import { CreateQuizDto } from "./quizzes/dto/create-quiz.dto";
import { ReviewCardDto } from "./flashcards/dto/review-card.dto";
import { ArticleCategory, QuestionType } from "@theo/database";

async function errorsFor(dto: object): Promise<number> {
  return (await validate(dto as object)).length;
}

describe("Content-module DTOs", () => {
  it("CreateResumeDto accepts title/data/template and rejects missing title", async () => {
    const ok = new CreateResumeDto();
    ok.title = "CV";
    ok.data = { name: "Theo" };
    ok.template = "modern";
    expect(await errorsFor(ok)).toBe(0);

    const missing = new CreateResumeDto();
    missing.data = {};
    expect(await errorsFor(missing)).toBeGreaterThan(0);
  });

  it("CreateArticleDto enforces the ArticleCategory enum", async () => {
    const ok = new CreateArticleDto();
    ok.title = "T";
    ok.slug = "t";
    ok.content = "c";
    ok.category = Object.values(ArticleCategory)[0];
    expect(await errorsFor(ok)).toBe(0);

    const bad = new CreateArticleDto();
    bad.title = "T";
    bad.slug = "t";
    bad.content = "c";
    // @ts-expect-error intentionally invalid enum value
    bad.category = "NOT_A_CATEGORY";
    expect(await errorsFor(bad)).toBeGreaterThan(0);
  });

  it("CreateQuestionDto requires question + correctAnswer and validates the enum", async () => {
    const ok = new CreateQuestionDto();
    ok.type = QuestionType.MULTIPLE_CHOICE;
    ok.question = "Q?";
    ok.correctAnswer = "A";
    expect(await errorsFor(ok)).toBe(0);

    const missing = new CreateQuestionDto();
    missing.type = QuestionType.MULTIPLE_CHOICE;
    expect(await errorsFor(missing)).toBeGreaterThan(0);
  });

  it("SubmitAnswerDto requires questionId + answer", async () => {
    const ok = new SubmitAnswerDto();
    ok.questionId = "q1";
    ok.answer = "a";
    expect(await errorsFor(ok)).toBe(0);

    const bad = new SubmitAnswerDto();
    bad.answer = "a";
    expect(await errorsFor(bad)).toBeGreaterThan(0);
  });

  it("CreateQuizDto accepts a boolean 'public' and rejects non-booleans", async () => {
    const ok = new CreateQuizDto();
    ok.title = "Quiz";
    ok.public = true;
    expect(await errorsFor(ok)).toBe(0);

    const bad = new CreateQuizDto();
    bad.title = "Quiz";
    // @ts-expect-error intentionally wrong type
    bad.public = "yes";
    expect(await errorsFor(bad)).toBeGreaterThan(0);
  });

  it("ReviewCardDto restricts quality to 0..5", async () => {
    const ok = new ReviewCardDto();
    ok.quality = 4;
    expect(await errorsFor(ok)).toBe(0);

    const outOfRange = new ReviewCardDto();
    outOfRange.quality = 9;
    expect(await errorsFor(outOfRange)).toBeGreaterThan(0);
  });
});
