import { IsString, IsObject, IsOptional, MaxLength } from "class-validator";

export class CreateResumeDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsObject()
  data!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  template?: string;
}
