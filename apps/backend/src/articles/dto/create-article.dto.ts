import { IsString, IsOptional, IsArray, IsEnum, MaxLength, ArrayMaxSize } from "class-validator";
import { ArticleCategory } from "@theo/database";

export class CreateArticleDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(200)
  slug!: string;

  @IsString()
  @MaxLength(100000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsEnum(ArticleCategory)
  category!: ArticleCategory;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
