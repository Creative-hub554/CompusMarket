import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Protects `/api/metrics`.
 *
 * Allows the request when either:
 *  - a valid Prometheus scrape token is presented (via the `X-Metrics-Token`
 *    header or `Authorization: Bearer <token>`), matching the `METRICS_TOKEN`
 *    env var, so the monitoring stack can scrape without a user session; or
 *  - a valid JWT with the `ADMIN` role is presented (dashboard inspection).
 *
 * The scrape token is intentionally separate from AUTH_SECRET so a leaked
 * metrics token only exposes operational counters, never user auth.
 */
@Injectable()
export class MetricsAuthGuard implements CanActivate {
  private readonly jwt: CanActivate = new (AuthGuard("jwt"))();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const expected = process.env.METRICS_TOKEN;
    const presented =
      (typeof req.headers["x-metrics-token"] === "string" &&
        req.headers["x-metrics-token"]) ||
      (typeof req.headers.authorization === "string" &&
        req.headers.authorization.startsWith("Bearer ") &&
        req.headers.authorization.slice("Bearer ".length));
    if (expected && presented === expected) {
      req.user = { role: "METRICS" };
      return true;
    }

    // Fall back to a signed-in ADMIN user.
    const ok = await this.jwt.canActivate(context);
    if (!ok) {
      throw new UnauthorizedException("Unauthorized");
    }
    if ((req.user?.role as string | undefined) !== "ADMIN") {
      throw new ForbiddenException("ADMIN role required");
    }
    return true;
  }
}
