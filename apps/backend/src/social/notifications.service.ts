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
