import { IsString, MaxLength } from "class-validator";

export class CreateCardDto {
  @IsString()
  @MaxLength(20000)
  front!: string;

  @IsString()
  @MaxLength(20000)
  back!: string;
}
