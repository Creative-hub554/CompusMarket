import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

/**
 * Guards backend-internal endpoints called by other first-party services (the
 * Next.js app). The caller presents the shared INTERNAL_SERVICE_TOKEN via the
 * X-Internal-Token header — mirroring the metrics scrape-token pattern but
 * intentionally without a JWT fallback: these routes are server-to-server only.
 */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expected = process.env.INTERNAL_SERVICE_TOKEN;
    const presented = req.headers?.["x-internal-token"];
    if (expected && typeof presented === "string" && presented === expected) {
      return true;
    }
    throw new UnauthorizedException("Invalid internal token");
  }
}
