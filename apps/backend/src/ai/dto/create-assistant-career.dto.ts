import { IsNotEmpty, IsString } from "class-validator";

export class CreateAssistantCareerDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsString()
  lang: string;
}