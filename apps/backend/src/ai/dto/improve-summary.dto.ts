import { IsString, IsOptional, MaxLength } from "class-validator";

export class ImproveSummaryDto {
  @IsString()
  @MaxLength(8000)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetRole?: string;
}
