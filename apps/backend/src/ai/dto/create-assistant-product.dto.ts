import { IsNotEmpty, IsString } from "class-validator";

export class CreateAssistantProductDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsString()
  lang: string;
}