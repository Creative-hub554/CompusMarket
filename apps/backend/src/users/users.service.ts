import { Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";
import { pushRoleToClerk } from "./clerk-sync";
import { notifyRoleChange } from "./role-change-notify";
import { parseLimit } from "../common/pagination";
import type { NotifyRoleChangeDto } from "./dto/notify-role-change.dto";

export const ROLE_CHANGE_REASON_MAX = 500;

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
          banReason: true,
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
   *
   * Every change writes an audit entry (actor, from/to role, optional reason)
   * in the same transaction, so the trail is never out of step with the role.
   * Bans persist their reason on the user row; any non-BANNED role clears it.
   * Resubmitting the current role is a no-op and records nothing.
   *
   * A change is also pushed to any configured Slack/Telegram webhook so ops is
   * alerted immediately; that push is best-effort like the Clerk mirror.
   */
  async setRole(
    targetId: string,
    role: Role,
    changedById: string,
    reason?: string,
    actorEmail?: string
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, name: true, role: true, clerkId: true },
    });
    if (!target) throw new NotFoundException("User not found");

    if (role === target.role) {
      return { id: target.id, email: target.email, role: target.role };
    }

    const cleanReason =
      typeof reason === "string" && reason.trim()
        ? reason.trim().slice(0, ROLE_CHANGE_REASON_MAX)
        : null;

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetId },
        data: {
          role,
          banReason: role === Role.BANNED ? cleanReason : null,
        },
        select: { id: true, email: true, role: true, banReason: true },
      }),
      this.prisma.roleChangeLog.create({
        data: {
          targetId,
          changedById,
          fromRole: target.role,
          toRole: role,
          reason: cleanReason,
        },
        select: { id: true },
      }),
    ]);

    if (target.clerkId) {
      try {
        await pushRoleToClerk(target.clerkId, role);
      } catch {
        // Best-effort mirror: a Clerk outage must not fail the role change.
      }
    }

    // Alert ops channels (no-op unless a webhook is configured).
    await notifyRoleChange({
      actorId: changedById,
      actorEmail: actorEmail ?? undefined,
      targetName: target.name ?? undefined,
      targetEmail: target.email,
      fromRole: target.role,
      toRole: role,
      reason: cleanReason,
    });

    return updated;
  }

  /**
   * Audit trail of role changes for one user, newest first (bounded to the last
   * 100 entries to keep the admin page light).
   */
  async history(targetId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException("User not found");

    return this.prisma.roleChangeLog.findMany({
      where: { targetId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        fromRole: true,
        toRole: true,
        reason: true,
        createdAt: true,
        changedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  /**
   * Alert ops channels about a role change that happened outside the app (a
   * Clerk-dashboard ban). The audit row is written by the caller; the backend
   * only resolves the target for a readable message and pushes the notice.
   * Never throws — alerting is best-effort like the Clerk mirror.
   */
  async notifyExternalChange(dto: NotifyRoleChangeDto): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: dto.targetId },
      select: { id: true, email: true, name: true },
    });
    if (!target) {
      // Nothing left to alert about; the change is already recorded elsewhere.
      return;
    }
    await notifyRoleChange({
      actorId: "system",
      actorLabel: "Clerk dashboard",
      targetName: target.name ?? undefined,
      targetEmail: target.email,
      fromRole: dto.fromRole,
      toRole: dto.toRole,
      reason: dto.reason ?? null,
    });
  }

  /**
   * Global activity feed: the most recent role changes across all users with
   * both the actor and the affected user, for the admin activity panel.
   */
  async recentChanges(limit?: number) {
    const take = parseLimit(limit !== undefined ? String(limit) : undefined, 10, 50);
    return this.prisma.roleChangeLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        fromRole: true,
        toRole: true,
        reason: true,
        createdAt: true,
        changedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        target: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }
}
