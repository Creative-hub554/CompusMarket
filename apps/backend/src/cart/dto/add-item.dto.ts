import { IsString, IsInt, Min, Max, IsNotEmpty } from "class-validator";

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}