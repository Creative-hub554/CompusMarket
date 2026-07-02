import { Module } from "@nestjs/common";
import { MinioService } from "./minio.service";
import { UploadController } from "./upload.controller";

@Module({
  controllers: [UploadController],
  providers: [MinioService],
  exports: [MinioService],
})
export class UploadModule {}
