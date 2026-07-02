import { Injectable, OnModuleInit } from "@nestjs/common";
import * as Minio from "minio";

const BUCKET = process.env.MINIO_BUCKET || "theo-platform";

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "admin",
      secretKey: process.env.MINIO_SECRET_KEY || "password123",
    });
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(BUCKET);
    if (!exists) {
      await this.client.makeBucket(BUCKET);
    }
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<string> {
    await this.client.putObject(
      BUCKET,
      filename,
      buffer,
      buffer.length,
      { "Content-Type": mimeType }
    );
    return filename;
  }

  async deleteFile(filename: string): Promise<void> {
    await this.client.removeObject(BUCKET, filename);
  }

  getFileUrl(filename: string): string {
    const endpoint = process.env.MINIO_ENDPOINT || "localhost";
    const port = process.env.MINIO_PORT || "9000";
    return `http://${endpoint}:${port}/${BUCKET}/${filename}`;
  }
}
