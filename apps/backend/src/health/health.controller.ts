import { Controller, Get, Logger, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type Redis from "ioredis";
import { Meilisearch } from "meilisearch";
import * as Minio from "minio";

interface ServiceStatus {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

/**
 * Health / readiness probe for the platform's backing services.
 *
 * Exposes three endpoints consumed by container healthchecks, orchestrators and
 * uptime monitors:
 *   GET /api/health/live   - liveness: the process is up (always 200 while running)
 *   GET /api/health/ready  - readiness: DB + Redis are required, Meili/MinIO degraded
 *   GET /api/health        - full detail of every dependency (200 unless required are down)
 */
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private prisma: PrismaService) {}

  @Get("live")
  live(): { status: "ok" } {
    // The process answering at all means it is alive.
    return { status: "ok" };
  }

  @Get("ready")
  async ready(): Promise<{ status: "ok" | "degraded"; checks: Record<string, string> }> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const checks: Record<string, string> = { db: db.status, redis: redis.status };

    const requiredDown = [db, redis].filter((c) => c.status !== "up");
    if (requiredDown.length > 0) {
      this.logger.warn(`Readiness failed: ${JSON.stringify(checks)}`);
      throw new ServiceUnavailableException({
        status: "unavailable",
        checks,
      });
    }
    return { status: "ok", checks };
  }

  @Get()
  async check() {
    const [db, redis, meilisearch, minio] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
      this.checkMeilisearch(),
      this.checkMinio(),
    ]);

    const checks: Record<string, ServiceStatus> = { db, redis, meilisearch, minio };
    const required = [db, redis];
    const degraded = required.some((c) => c.status !== "up");

    return {
      status: degraded ? "degraded" : "ok",
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDb(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "up", latencyMs: Date.now() - start };
    } catch (err) {
      return { status: "down", error: (err as Error).message };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    // Redis is optional in dev (rate-limiter falls back to memory). If no URL is
    // configured we report it as up-without-dep so readiness still passes.
    if (!process.env.REDIS_URL) return { status: "up" };
    const start = Date.now();
    const { default: RedisClient } = await import("ioredis");
    const client: Redis = new RedisClient(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      connectTimeout: 2000,
      retryStrategy: () => null,
    });
    try {
      await client.connect();
      const pong = await client.ping();
      return { status: pong === "PONG" ? "up" : "down", latencyMs: Date.now() - start };
    } catch (err) {
      return { status: "down", error: (err as Error).message };
    } finally {
      try {
        client.disconnect();
      } catch {
        /* noop */
      }
    }
  }

  private async checkMeilisearch(): Promise<ServiceStatus> {
    if (!process.env.MEILI_HOST) return { status: "up" };
    const start = Date.now();
    const client = new Meilisearch({
      host: process.env.MEILI_HOST,
      apiKey: process.env.MEILI_API_KEY || "",
    });
    try {
      await client.health();
      return { status: "up", latencyMs: Date.now() - start };
    } catch (err) {
      return { status: "down", error: (err as Error).message };
    }
  }

  private async checkMinio(): Promise<ServiceStatus> {
    if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
      return { status: "up" };
    }
    const start = Date.now();
    const client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
    try {
      const exists = await client.bucketExists(process.env.MINIO_BUCKET || "khmeronlineshopbytheo");
      return {
        status: exists ? "up" : "down",
        latencyMs: Date.now() - start,
        error: exists ? undefined : `bucket "${process.env.MINIO_BUCKET || "khmeronlineshopbytheo"}" missing`,
      };
    } catch (err) {
      return { status: "down", error: (err as Error).message };
    }
  }
}
