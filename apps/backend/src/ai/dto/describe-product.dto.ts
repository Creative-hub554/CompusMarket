import { IsString, IsOptional, MaxLength, IsEnum } from "class-validator";
import { ProductCondition } from "@theo/database";

export class DescribeProductDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(100)
  category!: string;

  @IsEnum(ProductCondition)
  condition!: ProductCondition;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  keywords?: string;
}
