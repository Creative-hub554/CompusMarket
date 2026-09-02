import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateReportDto {
  @IsNotEmpty()
  @IsEnum(["POST", "PRODUCT", "USER", "COMMENT"] as const)
  targetType!: "POST" | "PRODUCT" | "USER" | "COMMENT";

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