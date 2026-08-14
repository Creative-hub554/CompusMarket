import { IsString, IsOptional, MaxLength } from "class-validator";

export class CreateDocumentDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200000)
  content?: string;

  @IsOptional()
  @IsString()
  folderId?: string;
}
