import { IsNotEmpty, IsString, IsOptional, IsIn, IsBoolean } from "class-validator";

export class CreateAssistantProductDto {
  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsIn(["en", "zh", "km"])
  lang?: string;

  @IsOptional()
  @IsBoolean()
  hasResume?: boolean;
}
