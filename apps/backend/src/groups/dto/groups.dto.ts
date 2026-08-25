import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(["PUBLIC", "PRIVATE"])
  privacy?: "PUBLIC" | "PRIVATE";
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverUrl?: string;
}
