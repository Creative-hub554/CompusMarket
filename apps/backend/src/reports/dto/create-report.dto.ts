import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateReportDto {
  @IsNotEmpty()
  @IsEnum(["POST", "PRODUCT", "USER", "COMMENT", "PAGE"] as const)
  targetType!: "POST" | "PRODUCT" | "USER" | "COMMENT" | "PAGE";

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  targetId!: string;

  @IsNotEmpty()
  @IsEnum(["SPAM", "ABUSE", "FRAUD", "INAPPROPRIATE", "OTHER"] as const)
  reason!: "SPAM" | "ABUSE" | "FRAUD" | "INAPPROPRIATE" | "OTHER";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}