import { IsString, MinLength, MaxLength } from "class-validator";

export class ClaimWarrantyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}