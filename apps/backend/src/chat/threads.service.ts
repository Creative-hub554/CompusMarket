import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ChatGateway } from "./chat.gateway";
import { ChatBotService } from "./chat-bot.service";

const PARTICIPANT_SELECT = {
  id: true,
  userId: true,
  lastReadAt: true,
  user: { select: { id: true, name: true, username: true, image: true } },
};

@Injectable()
export class ThreadsService {
  constructor(
    private prisma: PrismaService,
    private chat: ChatGateway,
    private bot: ChatBotService
  ) {}

  /** Id of the built-in bot account (ensures it exists). */
  async getBotUserId(): Promise<string> {
    return this.bot.getBotUserId();
  }

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

    // Self-heal a concurrent create: two requests can both miss the findFirst
    // above (there is no DB-level unique on participant pairs, and SQLite can't
    // use Serializable isolation). If a matching thread now exists that isn't
    // the one we just made, drop our duplicate and return the survivor.
    const match = await this.prisma.thread.findFirst({
      where: {
        ...(productId ? { productId } : { productId: null }),
        id: { not: created.id },
        participants: { every: { userId: { in: [userId, otherUserId] } } },
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      select: { id: true },
    });
    if (match) {
      await this.prisma.thread.delete({ where: { id: created.id } });
      return match.id;
    }
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

  /**
   * Telegram-style contact sync: match a batch of emails/usernames against
   * registered users. Returns public profiles of everyone found (self excluded).
   */
  async syncContacts(userId: string, contacts: string[]) {
    const keys = [
      ...new Set(
        contacts
          .map((c) => c.trim().toLowerCase())
          .filter((c) => c.length > 0 && c.length <= 254)
      ),
    ].slice(0, 200);
    if (keys.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [{ email: { in: keys } }, { username: { in: keys } }],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        email: true,
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      image: u.image,
      matched: keys.filter(
        (k) => k === u.email?.toLowerCase() || k === u.username?.toLowerCase()
      ),
    }));
  }

  /**
   * Online users I share a private thread with, ranked by total messages
   * exchanged (most interacted first).
   */
  async listOnlineContacts(userId: string) {
    const onlineIds = this.chat.getOnlineUserIds().filter((id) => id !== userId);
    if (onlineIds.length === 0) return [];

    const participations = await this.prisma.threadParticipant.findMany({
      where: { userId, thread: { groupId: null } },
      select: {
        thread: {
          select: {
            lastMessageAt: true,
            _count: { select: { messages: true } },
            participants: {
              select: { userId: true, user: { select: { id: true, name: true, username: true, image: true } } },
            },
          },
        },
      },
    });

    type Contact = {
      user: { id: string; name: string | null; username: string | null; image: string | null };
      messageCount: number;
      lastMessageAt: Date | null;
    };
    const byUser = new Map<string, Contact>();

    for (const p of participations) {
      const other = p.thread.participants.find((t) => t.userId !== userId);
      if (!other || !onlineIds.includes(other.userId)) continue;

      const existing = byUser.get(other.userId);
      const count = p.thread._count.messages;
      const last = p.thread.lastMessageAt;
      if (!existing) {
        byUser.set(other.userId, { user: other.user, messageCount: count, lastMessageAt: last });
      } else {
        existing.messageCount += count;
        if (last && (!existing.lastMessageAt || last > existing.lastMessageAt)) {
          existing.lastMessageAt = last;
        }
      }
    }

    return [...byUser.values()].sort(
      (a, b) =>
        b.messageCount - a.messageCount ||
        (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0)
    );
  }
}
