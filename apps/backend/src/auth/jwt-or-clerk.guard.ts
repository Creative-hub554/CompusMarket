import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import jwt from "jsonwebtoken";
import { verifyToken } from "@clerk/backend";
import { getAuthSecret } from "../common/config";
import { PrismaService } from "../prisma/prisma.service";

type AuthedUser = { userId: string; email: string; role: string };

/**
 * Accepts two credential kinds on the same endpoint:
 *   1. The legacy Nest JWT (HS256 over AUTH_SECRET) whose `sub` is the local
 *      DB user id — what the storefront proxy and any remaining legacy clients
 *      present.
 *   2. A Clerk session token (JWKS-verified via CLERK_SECRET_KEY) whose `sub`
 *      is the Clerk user id — what the admin console's product relay now
 *      presents, since the internal-token header only works on /internal/*.
 * Identity is always resolved from the DB (by id for legacy, by clerkId for
 * Clerk), so role changes/bans apply immediately and token claims are never
 * trusted. Returns the same `{ userId, email, role }` shape JwtStrategy does,
 * keeping RolesGuard and downstream controllers unchanged.
 */
@Injectable()
export class JwtOrClerkGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization;
    const token =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;
    if (!token) {
      throw new UnauthorizedException();
    }

    const user = await this.resolveUser(token);
    if (!user) {
      throw new UnauthorizedException();
    }
    req.user = user;
    return true;
  }

  private async resolveUser(token: string): Promise<AuthedUser | null> {
    // 1. Legacy Nest JWT (sub = local DB user id).
    try {
      const payload = jwt.verify(token, getAuthSecret()) as { sub?: string };
      if (payload.sub) {
        const legacy = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, role: true },
        });
        if (legacy && legacy.role !== "BANNED") {
          return {
            userId: legacy.id,
            email: legacy.email,
            role: legacy.role,
          };
        }
        if (legacy) return null; // BANNED — do not fall through to Clerk.
      }
    } catch {
      // Not a legacy JWT (wrong key, expired, malformed) — try Clerk.
    }

    // 2. Clerk session token (sub = Clerk user id → local row by clerkId).
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) return null;
    try {
      const payload = await verifyToken(token, { secretKey });
      if (payload.sub) {
        const clerk = await this.prisma.user.findUnique({
          where: { clerkId: payload.sub },
          select: { id: true, email: true, role: true },
        });
        if (clerk && clerk.role !== "BANNED") {
          return {
            userId: clerk.id,
            email: clerk.email,
            role: clerk.role,
          };
        }
      }
    } catch {
      // Not a Clerk session token either.
    }
    return null;
  }
}