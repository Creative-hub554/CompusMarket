import { IsString, MaxLength } from "class-validator";

export class ImproveExperienceDto {
  @IsString()
  @MaxLength(8000)
  description!: string;

  @IsString()
  @MaxLength(200)
  position!: string;

  @IsString()
  @MaxLength(200)
  company!: string;
}
