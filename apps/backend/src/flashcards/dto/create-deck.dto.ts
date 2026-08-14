import { IsString, IsOptional, MaxLength } from "class-validator";

export class CreateDeckDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
