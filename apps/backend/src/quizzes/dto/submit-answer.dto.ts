import { IsString, MaxLength } from "class-validator";

export class SubmitAnswerDto {
  @IsString()
  @MaxLength(50)
  questionId!: string;

  @IsString()
  answer!: string;
}
