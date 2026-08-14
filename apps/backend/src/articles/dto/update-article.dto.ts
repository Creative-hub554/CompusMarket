import { IsString, IsOptional, IsArray, IsEnum, IsBoolean, MaxLength, ArrayMaxSize } from "class-validator";
import { ArticleCategory } from "@theo/database";

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
