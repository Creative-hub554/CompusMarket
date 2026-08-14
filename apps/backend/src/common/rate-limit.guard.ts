import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";
import { Request } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter keyed by client IP.
 *
 * NOTE: The store is per-process. For multi-instance deployments use a shared
 * store (e.g. Redis) instead.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 20, windowSec = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSec * 1000;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.ip || "unknown";
    const now = Date.now();

    // Prune expired entries to prevent unbounded memory growth.
    if (this.store.size > 0 && this.store.size % 100 === 0) {
      for (const [k, entry] of this.store) {
        if (now > entry.resetAt) this.store.delete(k);
      }
    } else {
      const existing = this.store.get(key);
      if (existing && now > existing.resetAt) this.store.delete(key);
    }

    let entry = this.store.get(key);
    if (!entry) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(key, entry);
    }

    entry.count++;
    if (entry.count > this.maxRequests) {
      throw new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
