import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength } from "class-validator";

export class CreateQuizDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  "public"?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimit?: number;
}
