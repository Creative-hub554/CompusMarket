import { Injectable, OnModuleInit } from "@nestjs/common";
import * as Minio from "minio";

const BUCKET = process.env.MINIO_BUCKET || "khmeronlineshopbytheo";

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;

  constructor() {
    if (!process.env.MINIO_ACCESS_KEY) {
      throw new Error("Missing required env var: MINIO_ACCESS_KEY");
    }
    if (!process.env.MINIO_SECRET_KEY) {
      throw new Error("Missing required env var: MINIO_SECRET_KEY");
    }
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(BUCKET);
      if (!exists) {
        await this.client.makeBucket(BUCKET);
      }
    } catch {
      // MinIO not available - skip. Image upload will fail with a clear error.
    }
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<string> {
    try {
      await this.client.putObject(
        BUCKET,
        filename,
        buffer,
        buffer.length,
        { "Content-Type": mimeType }
      );
      return filename;
    } catch {
      throw new Error("Storage service unavailable");
    }
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
