import { Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";
import { pushRoleToClerk } from "./clerk-sync";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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