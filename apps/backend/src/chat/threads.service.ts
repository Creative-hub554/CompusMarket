import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ChatGateway } from "./chat.gateway";
import { ChatBotService } from "./chat-bot.service";
import { NotificationsService } from "../social/notifications.service";

const MAX_CONVERSATION_MEMBERS = 50;
const PEOPLE_SEARCH_TAKE = 12;

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
    private bot: ChatBotService,
    private notifications: NotificationsService
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
      const participantCount = p.thread.participants.length;
      const kind = p.thread.group
        ? "GROUP"
        : participantCount > 2
          ? "GROUP_CHAT"
          : "DM";
      return {
        id: p.threadId,
        kind,
        product: p.thread.product,
        group: p.thread.group,
        participants: others,
        participantCount,
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

  /**
   * Messenger-style people search (name/@username). Never returns yourself
   * or the built-in bot; 2+ characters required to avoid giant result sets.
   */
  async searchPeople(userId: string, rawQuery: string) {
    const q = rawQuery?.trim() ?? "";
    if (q.length < 2) return [];
    const needle = q.toLowerCase();
    const botId = await this.bot.getBotUserId();
    const onlineIds = new Set(this.chat.getOnlineUserIds());

    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [userId, botId] },
        OR: [{ name: { contains: needle } }, { username: { contains: needle } }],
      },
      take: 100,
      select: { id: true, name: true, username: true, image: true },
    });

    // SQLite has no case-insensitive contains — filter again in JS.
    return users
      .filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(needle) ||
          (u.username ?? "").toLowerCase().includes(needle)
      )
      .slice(0, PEOPLE_SEARCH_TAKE)
      .map((u) => ({ ...u, online: onlineIds.has(u.id) }));
  }

  /**
   * Messenger-style conversation start. One peer → the existing 1:1 DM
   * (find-or-create, product-free). Two or more peers → a personal group
   * conversation (3+ people incl. you), deduplicated on the exact member set.
   */
  async createConversation(userId: string, rawUserIds: string[]) {
    if (!Array.isArray(rawUserIds)) {
      throw new BadRequestException("userIds must be an array");
    }
    const botId = await this.bot.getBotUserId();
    const ids = [...new Set(rawUserIds.map((id) => id?.trim()).filter(Boolean))].filter(
      (id) => id !== userId && id !== botId
    ).slice(0, MAX_CONVERSATION_MEMBERS - 1);
    if (ids.length === 0) {
      throw new BadRequestException("Pick at least one person to chat with");
    }

    const valid = await this.resolveUsers(ids);
    if (valid.length === 0) throw new NotFoundException("No matching users found");

    // Two people total → plain DM, reusing the product-free 1:1 thread.
    if (valid.length === 1) {
      const id = await this.findOrCreateThread(userId, valid[0]);
      return { id, kind: "DM", created: false };
    }

    const allIds = [userId, ...valid];
    const existing = await this.findConversationFor(allIds);
    if (existing) {
      return { id: existing.id, kind: "GROUP_CHAT", created: false };
    }

    const created = await this.prisma.thread.create({
      data: {
        participants: { create: allIds.map((id) => ({ userId: id })) },
      },
      select: { id: true },
    });

    // Self-heal a concurrent create: if another request won the race with the
    // exact same member set, drop ours and return the survivor.
    const match = await this.findConversationFor(allIds, created.id);
    if (match) {
      await this.prisma.thread.delete({ where: { id: created.id } });
      return { id: match.id, kind: "GROUP_CHAT", created: false };
    }

    return { id: created.id, kind: "GROUP_CHAT", created: true };
  }

  /**
   * Add people to a personal conversation. Any participant may add others
   * (Messenger semantics); product and community-group threads are managed
   * through their own flows and reject direct edits here.
   */
  async addParticipants(userId: string, threadId: string, rawUserIds: string[]) {
    if (!Array.isArray(rawUserIds) || rawUserIds.length === 0) {
      throw new BadRequestException("Provide at least one person to add");
    }
    await this.assertParticipant(threadId, userId);

    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        productId: true,
        groupId: true,
        participants: { select: { userId: true } },
      },
    });
    if (!thread) throw new NotFoundException("Thread not found");
    if (thread.productId || thread.groupId) {
      throw new BadRequestException(
        "You can only add people to personal conversations"
      );
    }

    const botId = await this.bot.getBotUserId();
    const existing = new Set(thread.participants.map((p) => p.userId));
    const requested = [...new Set(rawUserIds.map((id) => id?.trim()).filter(Boolean))];
    const targets = (await this.resolveUsers(requested)).filter(
      (id) => id !== userId && id !== botId && !existing.has(id)
    );
    if (targets.length === 0) {
      return { added: 0, participantCount: existing.size };
    }
    if (existing.size + targets.length > MAX_CONVERSATION_MEMBERS) {
      throw new BadRequestException(
        `Conversations can have at most ${MAX_CONVERSATION_MEMBERS} members`
      );
    }

    for (const targetId of targets) {
      await this.prisma.threadParticipant.create({
        data: { threadId, userId: targetId },
      });
    }
    await Promise.all(
      targets.map((targetId) =>
        this.notifications.notify({
          userId: targetId,
          actorId: userId,
          kind: "MESSAGE",
          entityId: threadId,
          message: "Added you to a conversation",
        })
      )
    );

    return { added: targets.length, participantCount: existing.size + targets.length };
  }

  /**
   * Leave a personal conversation. The last two members' chat is deleted
   * (fewer than two people left would be an unusable thread); personal chats
   * with at least two people survive the leaver.
   */
  async leaveConversation(userId: string, threadId: string) {
    await this.assertParticipant(threadId, userId);

    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, productId: true, groupId: true },
    });
    if (!thread) throw new NotFoundException("Thread not found");
    if (thread.productId || thread.groupId) {
      throw new BadRequestException(
        "This chat is part of a product or community group — leave it from there instead"
      );
    }

    const rows = await this.prisma.threadParticipant.findMany({
      where: { threadId },
      select: { userId: true },
    });
    if (rows.length === 0) return { left: true, deleted: false };

    await this.prisma.threadParticipant.deleteMany({
      where: { threadId, userId },
    });

    const remaining = rows.length - 1;
    if (remaining < 2) {
      await this.prisma.thread.delete({ where: { id: threadId } });
      return { left: true, deleted: true };
    }
    return { left: true, deleted: false, participantCount: remaining };
  }

  /** Resolve raw ids to registered user ids (order-preserving, deduped). */
  private async resolveUsers(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const found = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const byId = new Set(found.map((u) => u.id));
    return ids.filter((id) => byId.has(id));
  }

  /**
   * Find a personal (non-product, non-group) thread whose participant set is
   * exactly the given members. Excludes product/community threads so DMs and
   * group conversations never collide with them.
   */
  private async findConversationFor(userIds: string[], notId?: string) {
    const threads = await this.prisma.thread.findMany({
      where: {
        productId: null,
        groupId: null,
        ...(notId ? { id: { not: notId } } : {}),
        participants: { every: { userId: { in: userIds } } },
      },
      select: { id: true, participants: { select: { userId: true } } },
    });
    const target = new Set(userIds);
    return (
      threads.find(
        (t) =>
          t.participants.length === target.size &&
          t.participants.every((p) => target.has(p.userId))
      ) ?? null
    );
  }
}
