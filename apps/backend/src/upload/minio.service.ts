import { Injectable, OnModuleInit } from "@nestjs/common";
import * as Minio from "minio";

const BUCKET = process.env.MINIO_BUCKET || "khmeronlineshopbytheo";

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client | null = null;
  private ready = false;

  async onModuleInit() {
    if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
      // MinIO is optional for local dev (SQLite-only). Uploads fail with a clear error.
      return;
    }
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
    try {
      const exists = await this.client.bucketExists(BUCKET);
      if (!exists) {
        await this.client.makeBucket(BUCKET);
      }
      this.ready = true;
    } catch {
      // MinIO not reachable - uploads will fail with a clear error when attempted.
    }
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    disposition: "inline" | "attachment" = "attachment"
  ): Promise<string> {
    if (!this.client || !this.ready) {
      throw new Error("Storage service unavailable");
    }
    try {
      await this.client.putObject(BUCKET, filename, buffer, buffer.length, {
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
      });
      return filename;
    } catch {
      throw new Error("Storage service unavailable");
    }
  }

  async deleteFile(filename: string): Promise<void> {
    if (!this.client || !this.ready) {
      throw new Error("Storage service unavailable");
    }
    await this.client.removeObject(BUCKET, filename);
  }

  getFileUrl(filename: string): string {
    const endpoint = process.env.MINIO_ENDPOINT || "localhost";
    const port = process.env.MINIO_PORT || "9000";
    const scheme = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
    return `${scheme}://${endpoint}:${port}/${BUCKET}/${filename}`;
  }
}
