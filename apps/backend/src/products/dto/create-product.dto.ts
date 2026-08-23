import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsBoolean, MaxLength } from "class-validator";

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

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  videoUrl?: string;

  @IsOptional()
  @IsBoolean()
  videoActive?: boolean;
}
