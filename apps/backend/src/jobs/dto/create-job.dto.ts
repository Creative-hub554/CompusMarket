import { IsString, IsEnum, IsOptional, IsInt, Min } from "class-validator";
import { JobType } from "@theo/database";

export class CreateJobDto {
  @IsString()
  title!: string;

  @IsString()
  company!: string;

  @IsString()
  location!: string;

  @IsEnum(JobType)
  type!: JobType;

  @IsString()
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMax?: number;
}
