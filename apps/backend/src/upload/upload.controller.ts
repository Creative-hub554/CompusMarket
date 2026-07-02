import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { MinioService } from "./minio.service";
import { v4 as uuid } from "uuid";
import * as path from "path";

@Controller("upload")
export class UploadController {
  constructor(private readonly minio: MinioService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;

    await this.minio.uploadFile(file.buffer, filename, file.mimetype);

    return {
      url: this.minio.getFileUrl(filename),
      filename,
    };
  }
}
