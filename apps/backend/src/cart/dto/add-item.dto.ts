import { IsString, IsInt, Min, IsNotEmpty } from "class-validator";

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}