import { IsString, IsInt, Min } from "class-validator";

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

  @IsString()
  startDate!: string;
}