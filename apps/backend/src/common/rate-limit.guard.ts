import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import type Redis from "ioredis";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Rate limiter keyed by client IP.
 *
 * Uses a fixed-window counter. Backed by Redis (REDIS_URL) when available so
 * limits are shared across instances; falls back to an in-process store
 * otherwise. The Redis client is loaded lazily so the guard works without the
 * dependency being reachable at runtime.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private memoryStore = new Map<string, RateLimitEntry>();
  private redis: Redis | null = null;
  private redisTried = false;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 20, windowSec = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSec * 1000;
  }

  private async getRedis(): Promise<Redis | null> {
    if (!this.redisTried) {
      this.redisTried = true;
      if (process.env.REDIS_URL) {
        try {
          const { default: RedisClient } = await import("ioredis");
          this.redis = new RedisClient(process.env.REDIS_URL, {
            // Never let limiter failures take down request handling: bail out
            // of a stuck command quickly and fall through to the memory store.
            maxRetriesPerRequest: 1,
            lazyConnect: false,
            // Keep reconnecting with capped backoff so the shared limiter
            // recovers after a Redis restart or network blip.
            retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
          });
          this.redis.on("error", (err) => {
            this.logger.warn(`Redis unavailable, using in-memory limiter: ${err.message}`);
          });
        } catch (err) {
          this.logger.warn(
            `ioredis not loadable, using in-memory limiter: ${(err as Error).message}`
          );
        }
      }
    }
    return this.redis;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = `ratelimit:${request.ip || "unknown"}`;
    const now = Date.now();

    const redis = await this.getRedis();
    if (redis) {
      try {
        const windowSec = Math.ceil(this.windowMs / 1000);
        const windowId = Math.floor(now / this.windowMs);
        const bucketKey = `${key}:${windowId}`;
        // SET NX EX guarantees the bucket has a TTL before the first INCR, so
        // a crash between INCR and EXPIRE can never leak an immortal key.
        await redis.set(bucketKey, "0", "EX", windowSec + 1, "NX");
        const count = await redis.incr(bucketKey);
        if (count > this.maxRequests) {
          throw new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
      } catch (err) {
        if (err instanceof HttpException) throw err;
        // Fall through to in-memory on any Redis error.
      }
    }

    this.consumeMemory(key, now);
    return true;
  }

  private consumeMemory(key: string, now: number) {
    const store = this.memoryStore;

    // Prune expired entries to prevent unbounded memory growth.
    if (store.size > 0 && store.size % 100 === 0) {
      for (const [k, entry] of store) {
        if (now > entry.resetAt) store.delete(k);
      }
    } else {
      const existing = store.get(key);
      if (existing && now > existing.resetAt) store.delete(key);
    }

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      store.set(key, entry);
    }

    entry.count++;
    if (entry.count > this.maxRequests) {
      throw new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
