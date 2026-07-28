import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { MinioService } from "./minio.service";
import { v4 as uuid } from "uuid";
import * as path from "path";
import sharp from "sharp";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"];

@Controller("upload")
export class UploadController {
  constructor(private readonly minio: MinioService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER", "SELLER")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    let buffer = file.buffer;
    let mimeType = file.mimetype;

    if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
      buffer = await sharp(file.buffer)
        .webp({ quality: 80 })
        .toBuffer();
      mimeType = "image/webp";
    }

    const ext = mimeType === "image/webp" ? ".webp" : path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;

    await this.minio.uploadFile(buffer, filename, mimeType);

    return {
      url: this.minio.getFileUrl(filename),
      filename,
    };
  }
}
