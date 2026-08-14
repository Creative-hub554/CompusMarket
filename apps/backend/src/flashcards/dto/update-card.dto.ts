import { IsString, IsOptional, MaxLength } from "class-validator";

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  front?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  back?: string;
}
