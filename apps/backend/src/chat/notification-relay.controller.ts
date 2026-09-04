import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { InternalTokenGuard } from "../users/internal-token.guard";
import { PrismaService } from "../prisma/prisma.service";
import { notificationEvents, NOTIFICATION_CREATED } from "../realtime/notification.events";
import { DeliverNotificationDto } from "./dto/deliver-notification.dto";

const ACTOR_SELECT = { id: true, name: true, username: true, image: true };

/**
 * Lets first-party services that insert notification rows directly into the
 * shared DB (the admin app's report-resolution route) hand those rows to the
 * ChatGateway so they reach the recipient's live sockets immediately. The
 * actor profile is resolved from the DB — never trusted from the caller — so
 * the emitted payload matches what NotificationsService.notify() produces.
 *
 * No-op when the recipient has no open socket (the gateway only fans out to
 * connected users); the row is already persisted, so the notification bell
 * still picks it up on its next poll. Guarded by the shared internal token,
 * same as /internal/role-changes/notify.
 */
@Controller("internal/notifications")
@UseGuards(InternalTokenGuard)
export class NotificationRelayController {
  constructor(private prisma: PrismaService) {}

  @Post("deliver")
  @HttpCode(204)
  async deliver(@Body() dto: DeliverNotificationDto) {
    const actor = await this.prisma.user.findUnique({
      where: { id: dto.actorId },
      select: ACTOR_SELECT,
    });
    if (!actor) return;

    notificationEvents.emit(NOTIFICATION_CREATED, {
      userId: dto.userId,
      actorId: dto.actorId,
      kind: dto.kind,
      entityId: dto.entityId ?? null,
      message: dto.message ?? null,
      readAt: null,
      createdAt: new Date(),
      actor,
    });
  }
}
