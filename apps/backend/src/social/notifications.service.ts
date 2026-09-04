import { Injectable } from "@nestjs/common";
import { NotificationKind } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";
import { notificationEvents, NOTIFICATION_CREATED } from "../realtime/notification.events";

const AUTHOR_SELECT = { id: true, name: true, username: true, image: true };

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async notify(input: {
    userId: string;
    actorId: string;
    kind: NotificationKind;
    entityId?: string;
    message?: string;
  }): Promise<void> {
    if (input.userId === input.actorId) return;
    const created = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId,
        kind: input.kind,
        entityId: input.entityId,
        message: input.message,
      },
      include: { actor: { select: AUTHOR_SELECT } },
    });
    notificationEvents.emit(NOTIFICATION_CREATED, created);
  }

  /**
   * REACTION notifications are coalesced per (recipient, actor, post): an
   * author keeps at most one unread row per actor, so flicking through
   * emojis updates the existing row instead of stacking duplicates.
   */
  async notifyReaction(input: {
    userId: string;
    actorId: string;
    entityId: string;
    emoji: string;
  }): Promise<void> {
    if (input.userId === input.actorId) return;
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: input.userId,
        actorId: input.actorId,
        kind: "REACTION",
        entityId: input.entityId,
        readAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      // Refresh the emoji on the still-unread row; no new row, no new emit.
      await this.prisma.notification.update({
        where: { id: existing.id },
        data: { message: input.emoji },
      });
      return;
    }
    await this.notify({
      userId: input.userId,
      actorId: input.actorId,
      kind: "REACTION",
      entityId: input.entityId,
      message: input.emoji,
    });
  }

  list(userId: string, limit = 30) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: AUTHOR_SELECT } },
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id?: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: id ? { userId, id } : { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
