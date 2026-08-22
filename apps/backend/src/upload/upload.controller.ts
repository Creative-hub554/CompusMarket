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
import sharp from "sharp";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const VIDEO_MAX_SIZE = 100 * 1024 * 1024;

function imageInterceptor() {
  return FileInterceptor("file", {
    limits: { fileSize: IMAGE_MAX_SIZE },
    fileFilter: (req, file, cb) => {
      if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException("Only image files are allowed"), false);
      }
    },
  });
}

const videoInterceptor = FileInterceptor("file", {
  limits: { fileSize: VIDEO_MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (VIDEO_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException("Only MP4, WebM or MOV videos are allowed"), false);
    }
  },
});

@Controller("upload")
export class UploadController {
  constructor(private readonly minio: MinioService) {}

  // Legacy staff-only endpoint kept for existing admin/seller flows.
  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER", "SELLER")
  @UseInterceptors(imageInterceptor())
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.processImage(file);
  }

  @Post("image")
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(imageInterceptor())
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.processImage(file);
  }

  @Post("video")
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(videoInterceptor)
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");

    const ext =
      file.mimetype === "video/webm" ? "webm" : file.mimetype === "video/quicktime" ? "mov" : "mp4";
    const filename = `${uuid()}.${ext}`;

    await this.minio.uploadFile(file.buffer, filename, file.mimetype, "inline");

    return {
      url: this.minio.getFileUrl(filename),
      filename,
      size: file.buffer.length,
    };
  }

  private async processImage(file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");

    const buffer = await sharp(file.buffer)
      .webp({ quality: 80 })
      .toBuffer();
    const filename = `${uuid()}.webp`;

    await this.minio.uploadFile(buffer, filename, "image/webp", "inline");

    return {
      url: this.minio.getFileUrl(filename),
      filename,
    };
  }
}
