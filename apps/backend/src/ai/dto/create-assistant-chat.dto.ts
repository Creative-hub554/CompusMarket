import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateAssistantChatDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  message!: string;

  @IsOptional()
  @IsIn(["en", "zh", "km"])
  lang?: string;

  @IsOptional()
  @IsBoolean()
  hasResume?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  page?: string;
}
