import { IsString, IsOptional, IsArray, IsEnum, IsInt, Min, MaxLength, ArrayMaxSize } from "class-validator";
import { QuestionType } from "@theo/database";

export class CreateQuestionDto {
  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  @MaxLength(2000)
  question!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  options?: string[];

  @IsString()
  @MaxLength(2000)
  correctAnswer!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
