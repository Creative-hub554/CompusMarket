import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { Module, MiddlewareConsumer, NestModule, RequestMethod } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, ROLES_KEY } from "../auth/roles.guard";
import { SetMetadata } from "@nestjs/common";
import { register, Counter, Histogram, Gauge } from "prom-client";
import type { Request, Response, NextFunction } from "express";

/**
 * Prometheus metrics for the backend.
 *
 * Exposes a `/api/metrics` endpoint (Prometheus text format) capturing:
 *  - HTTP request count / duration / status, labelled by method + route
 *  - active HTTP requests (in-flight gauge)
 *  - process / event-loop / memory gauges
 *
 * Added behind MERTICS_ENABLED so local dev stays lean; defaults off.
 */

@Injectable()
class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);

  httpRequests = new Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "status"],
  });

  httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });

  inFlight = new Gauge({
    name: "http_in_flight_requests",
    help: "In-flight HTTP requests",
  });

  onModuleInit() {
    register.setDefaultLabels({ service: "backend" });
  }

  onModuleDestroy() {
    try {
      register.clear();
    } catch {
      /* noop */
    }
  }

  async metrics(): Promise<string> {
    return register.metrics();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      this.inFlight.inc();
      const start = process.hrtime.bigint();
      res.on("finish", () => {
        const seconds = Number(process.hrtime.bigint() - start) / 1e9;
        const route = (req.route?.path || req.path) as string;
        this.httpRequests.inc({ method: req.method, route, status: res.statusCode });
        this.httpRequestDuration.observe({ method: req.method, route, status: res.statusCode }, seconds);
        this.inFlight.dec();
      });
      next();
    };
  }
}

@Controller("metrics")
@UseGuards(AuthGuard("jwt"), RolesGuard)
class MetricsController {
  constructor(private service: MetricsService) {}

  @Get()
  @SetMetadata(ROLES_KEY, ["ADMIN"])
  async index() {
    return this.service.metrics();
  }
}

@Module({
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule implements NestModule {
  constructor(private service: MetricsService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(this.service.middleware())
      .exclude(
        { path: "metrics", method: RequestMethod.ALL },
        { path: "health", method: RequestMethod.ALL },
      )
      .forRoutes("*");
  }
}
