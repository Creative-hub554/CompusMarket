import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { getAuthSecret } from "../common/config";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getAuthSecret(),
    });
  }

  async validate(payload: { sub: string }) {
    // Resolve identity from the DB rather than trusting the token claims:
    // this reflects role changes immediately and rejects banned/deleted
    // users even while an old access token is still valid.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user || user.role === "BANNED") {
      throw new UnauthorizedException();
    }
    return { userId: user.id, email: user.email, role: user.role };
  }
}
