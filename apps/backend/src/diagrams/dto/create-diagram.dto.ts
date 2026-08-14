import { IsString, IsOptional, MaxLength } from "class-validator";

export class CreateDiagramDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(200000)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;
}
