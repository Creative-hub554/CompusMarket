import { IsString, IsOptional, MaxLength } from "class-validator";

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200000)
  content?: string;

  @IsOptional()
  @IsString()
  folderId?: string;
}
