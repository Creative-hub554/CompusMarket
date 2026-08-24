import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PURGE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

@Injectable()
export class AuthService {
  private static lastPurgeAt = 0;

  constructor(private jwtService: JwtService, private prisma: PrismaService) {}

  private async issueTokenPair(user: {
    id: string;
    email: string;
    role: string;
    name?: string | null;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = crypto.randomBytes(48).toString("hex");
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: sha256(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.role === "BANNED") {
      throw new UnauthorizedException("Account suspended");
    }

    return this.issueTokenPair(user);
  }

  async register(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new UnauthorizedException("Email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    });

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });

    if (!stored || !stored.user) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Presenting an already-revoked token suggests theft: revoke every active
    // token of the owning user, not just this one.
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (stored.user.role === "BANNED") {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Account suspended");
    }

    // Rotate atomically: only the first concurrent request wins the conditional
    // revoke, so parallel refreshes can never both mint a fresh pair.
    const rotated = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (rotated.count === 0) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    this.purgeExpiredTokens();

    const { id, email, role } = stored.user;
    return this.issueTokenPair({ id, email, role });
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  /**
   * Opportunistic housekeeping (throttled to once per hour): drop expired
   * tokens and tokens revoked long enough ago that reuse detection no longer
   * needs them. Fire-and-forget so failures never block a refresh.
   */
  private purgeExpiredTokens() {
    const now = Date.now();
    if (now - AuthService.lastPurgeAt < PURGE_INTERVAL_MS) return;
    AuthService.lastPurgeAt = now;

    const cutoff = new Date(now - REFRESH_TOKEN_TTL_MS);
    this.prisma.refreshToken
      .deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }],
        },
      })
      .catch(() => {});
  }
}
