import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PARTICIPANT_SELECT = {
  id: true,
  userId: true,
  lastReadAt: true,
  user: { select: { id: true, name: true, username: true, image: true } },
};

@Injectable()
export class ThreadsService {
  constructor(private prisma: PrismaService) {}

  private async assertParticipant(threadId: string, userId: string) {
    const participant = await this.prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException("Not a participant of this thread");
  }

  async resolveSellerUserId(sellerProfileId: string): Promise<string> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      select: { userId: true },
    });
    if (!seller) throw new NotFoundException("Seller not found");
    return seller.userId;
  }

  async findOrCreateThread(userId: string, otherUserId: string, productId?: string): Promise<string> {
    if (userId === otherUserId) {
      throw new BadRequestException("You cannot start a thread with yourself");
    }
    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });
    if (!other) throw new NotFoundException("User not found");

    const existing = await this.prisma.thread.findFirst({
      where: {
        ...(productId ? { productId } : { productId: null }),
        participants: { every: { userId: { in: [userId, otherUserId] } } },
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await this.prisma.thread.create({
      data: {
        ...(productId ? { productId } : {}),
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      select: { id: true },
    });
    return created.id;
  }

  async listThreads(userId: string) {
    const participations = await this.prisma.threadParticipant.findMany({
      where: { userId },
      include: {
        thread: {
          include: {
            participants: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            product: { select: { id: true, name: true, price: true, images: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    const unreadCounts = await this.prisma.message.groupBy({
      by: ["threadId"],
      where: {
        threadId: { in: participations.map((p) => p.threadId) },
        senderId: { not: userId },
        readAt: null,
      },
      _count: { _all: true },
    });
    const unreadByThread = new Map(
      unreadCounts.map((c) => [c.threadId, c._count._all])
    );

    const mapped = participations.map((p) => {
      const others = p.thread.participants
        .filter((t) => t.userId !== userId)
        .map((t) => t.user);
      const lastMessage = p.thread.messages[0] ?? null;
      return {
        id: p.threadId,
        product: p.thread.product,
        group: p.thread.group,
        participants: others,
        lastMessage,
        lastMessageAt: p.thread.lastMessageAt,
        unreadCount: unreadByThread.get(p.threadId) ?? 0,
      };
    });

    return mapped.sort(
      (a, b) =>
        (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0)
    );
  }

  async getMessages(threadId: string, userId: string, cursorId?: string, limit = 30) {
    await this.assertParticipant(threadId, userId);
    const messages = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: { sender: { select: { id: true, name: true, image: true } } },
    });
    const hasMore = messages.length > limit;
    const items = messages.slice(0, limit);
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async markRead(threadId: string, userId: string): Promise<void> {
    await this.assertParticipant(threadId, userId);
    await Promise.all([
      this.prisma.threadParticipant.update({
        where: { threadId_userId: { threadId, userId } },
        data: { lastReadAt: new Date() },
      }),
      this.prisma.message.updateMany({
        where: { threadId, senderId: { not: userId }, readAt: null },
        data: { readAt: new Date() },
      }),
    ]);
  }

  async participantIds(threadId: string): Promise<string[]> {
    const rows = await this.prisma.threadParticipant.findMany({
      where: { threadId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  async getThreadWithParticipants(threadId: string) {
    return this.prisma.thread.findUnique({
      where: { id: threadId },
      include: { participants: { select: PARTICIPANT_SELECT } },
    });
  }

}
