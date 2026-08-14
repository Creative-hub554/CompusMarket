import { IsInt, Min, Max } from "class-validator";

export class ReviewCardDto {
  @IsInt()
  @Min(0)
  @Max(5)
  quality!: number;
}
