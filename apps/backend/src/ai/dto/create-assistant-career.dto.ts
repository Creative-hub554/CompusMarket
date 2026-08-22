import { IsNotEmpty, IsString, IsOptional, IsIn } from "class-validator";

export class CreateAssistantCareerDto {
  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsIn(["en", "zh", "km"])
  lang?: string;
}
