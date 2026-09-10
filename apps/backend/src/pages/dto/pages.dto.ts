import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export class CreatePageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @Matches(USERNAME_RE, { message: "Username must be 3-24 letters, numbers or underscores" })
  username!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class AddPageMemberDto {
  @IsString()
  userId!: string;

  @IsIn(["OWNER", "EDITOR"])
  role!: "OWNER" | "EDITOR";
}
