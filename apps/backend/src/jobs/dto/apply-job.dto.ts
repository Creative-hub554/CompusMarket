import { IsOptional, IsString, MaxLength } from "class-validator";

export class ApplyJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverLetter?: string;

  @IsOptional()
  @IsString()
  resumeId?: string;
}
