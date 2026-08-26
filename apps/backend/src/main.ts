import { config } from "dotenv";
import { resolve } from "path";
// The per-app .env is the source of truth: override inherited shell/user-level
// variables so stale machine-wide placeholders (e.g. OPENROUTER_API_KEY) can't
// shadow real local config.
config({ path: resolve(__dirname, "../.env"), override: true });

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { getCorsOrigins } from "./common/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");

  // Explicit allow-list of origins (comma-separated via CORS_ORIGIN env).
  app.enableCors({ origin: getCorsOrigins(), credentials: true });

  // Trust the first proxy hop so request.ip reflects the real client IP
  // (required for IP-based rate limiting behind a reverse proxy).
  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.set("trust proxy", 1);

  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();