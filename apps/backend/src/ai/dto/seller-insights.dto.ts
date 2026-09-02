import { IsIn, IsOptional } from "class-validator";

export class SellerInsightsDto {
  @IsOptional()
  @IsIn(["en", "km"])
  lang?: string;
}