import { IsString, IsArray, MaxLength, ArrayMaxSize } from "class-validator";

export class CoverLetterDto {
  @IsString()
  @MaxLength(200)
  fullName!: string;

  @IsString()
  @MaxLength(200)
  targetRole!: string;

  @IsString()
  @MaxLength(200)
  company!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  skills!: string[];

  @IsString()
  @MaxLength(8000)
  experience!: string;
}
