import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class PostMediaInputDto {
  @IsString()
  url!: string;

  @IsIn(["IMAGE", "VIDEO"])
  kind!: "IMAGE" | "VIDEO";

  @IsOptional()
  @IsString()
  thumbUrl?: string;
}

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsArray()
  @Max(8)
  @ValidateNested({ each: true })
  @Type(() => PostMediaInputDto)
  media?: PostMediaInputDto[];
}

export class UpdatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}

export class ReactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  emoji!: string;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateStoryDto {
  @IsString()
  mediaUrl!: string;

  @IsIn(["IMAGE", "VIDEO"])
  mediaKind: "IMAGE" | "VIDEO" = "IMAGE";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,24}$/, { message: "Username must be 3-24 letters, numbers or underscores" })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  accountPrivate?: boolean;
}
