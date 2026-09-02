import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Module, Global } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import * as Sentry from "@sentry/node";

/**
 * Zero-config Sentry entry point for the NestJS backend.
 *
 * Initialization is driven by the SENTRY_DSN env var. When it is empty
 * (local dev / CI) everything is a no-op, so the app runs unchanged.
 */

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 0.1,
    profilesSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE
      ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE)
      : 0.1,
  });
}

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap({
        error: (exception: unknown) => {
          if (!process.env.SENTRY_DSN) return;
          Sentry.captureException(exception);
        },
      })
    );
  }
}

@Global()
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
})
export class SentryModule {}
