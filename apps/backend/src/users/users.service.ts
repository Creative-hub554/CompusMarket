import { Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";
import { pushRoleToClerk } from "./clerk-sync";
import { parseLimit } from "../common/pagination";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Admin user directory: search by email/name/username with bounded
   * pagination, newest first. Role/ban state is the DB source of truth.
   */
  async list(opts: { q?: string; page?: number; limit?: number }) {
    const limit = parseLimit(opts.limit !== undefined ? String(opts.limit) : undefined, 20, 50);
    const page = Number.isFinite(opts.page) ? Math.max(opts.page as number, 1) : 1;
    const q = typeof opts.q === "string" ? opts.q.trim() : undefined;
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { username: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          image: true,
          role: true,
          clerkId: true,
          accountPrivate: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Change a user's application role (promote/demote, ban via BANNED, unban via
   * any other value). The database is authoritative: the role is written first,
   * then mirrored to Clerk publicMetadata so Clerk-backed UI reflects it
   * immediately. Users without a Clerk identity are updated locally only.
   */
  async setRole(targetId: string, role: Role) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, clerkId: true },
    });
    if (!target) throw new NotFoundException("User not found");

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    if (target.clerkId) {
      try {
        await pushRoleToClerk(target.clerkId, role);
      } catch {
        // Best-effort mirror: a Clerk outage must not fail the role change.
      }
    }
    return updated;
  }
}