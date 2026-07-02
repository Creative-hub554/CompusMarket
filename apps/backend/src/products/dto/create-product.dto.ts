import { IsString, IsNumber, IsEnum, IsOptional, IsArray } from "class-validator";

export enum ProductConditionDto {
  A = "A",
  B = "B",
  C = "C",
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsNumber()
  price!: number;

  @IsEnum(ProductConditionDto)
  condition!: ProductConditionDto;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsNumber()
  warrantyMonths?: number;
}
