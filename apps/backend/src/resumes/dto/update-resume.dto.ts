import { IsString, IsObject, IsOptional, MaxLength } from "class-validator";

export class UpdateResumeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  template?: string;
}
