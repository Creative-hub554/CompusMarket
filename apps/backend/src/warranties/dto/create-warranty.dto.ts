import { IsString, IsInt, Min, IsISO8601 } from "class-validator";

export class CreateWarrantyDto {
  @IsString()
  orderItemId!: string;

  @IsString()
  productId!: string;

  @IsString()
  userId!: string;

  @IsInt()
  @Min(1)
  months!: number;

  @IsISO8601()
  startDate!: string;
}