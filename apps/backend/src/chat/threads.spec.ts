import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ThreadsService } from "./threads.service";
import { PrismaService } from "../prisma/prisma.service";
import { ChatGateway } from "./chat.gateway";
import { ChatBotService } from "./chat-bot.service";
import { NotificationsService } from "../social/notifications.service";

// Importing the real gateway runs module-level getAuthSecret(); stub it out.
vi.mock("./chat.gateway", () => ({
  ChatGateway: class {},
}));

function makeBot() {
  return { getBotUserId: vi.fn(async () => "bot-id"), shouldRespond: vi.fn(async () => false), buildReplies: vi.fn(async () => []) };
}

function makeNotifications() {
  return { notify: vi.fn(async () => ({})) };
}

function makePrisma() {
  return {
    thread: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    threadParticipant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    message: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

function makeGateway(online: string[] = []) {
  return { getOnlineUserIds: vi.fn(() => online) };
}

describe("ThreadsService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ThreadsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    service = new ThreadsService(
      prisma as unknown as PrismaService,
      makeGateway() as unknown as ChatGateway,
        makeBot() as unknown as ChatBotService,
        makeNotifications() as unknown as NotificationsService
      );
  });

  describe("findOrCreateThread", () => {
    it("rejects self-threads", async () => {
      await expect(service.findOrCreateThread("u1", "u1")).rejects.toThrow(BadRequestException);
    });

    it("rejects unknown users", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOrCreateThread("u1", "ghost")).rejects.toThrow(NotFoundException);
    });

    it("returns the existing thread id when one matches", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u2" });
      prisma.thread.findFirst.mockResolvedValue({ id: "t-existing" });

      const id = await service.findOrCreateThread("u1", "u2");

      expect(id).toBe("t-existing");
      expect(prisma.thread.create).not.toHaveBeenCalled();
    });

    it("creates a thread with both participants", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u2" });
      prisma.thread.findFirst.mockResolvedValue(null);
      prisma.thread.create.mockResolvedValue({ id: "t-new" });

      const id = await service.findOrCreateThread("u1", "u2", "prod-1");

      expect(id).toBe("t-new");
      expect(prisma.thread.create).toHaveBeenCalledWith({
        data: {
          productId: "prod-1",
          participants: { create: [{ userId: "u1" }, { userId: "u2" }] },
        },
        select: { id: true },
      });
    });
  });

  describe("listThreads", () => {
    it("maps other participants, unread counts and sorts by recency", async () => {
      const older = new Date("2026-01-01T10:00:00Z");
      const newer = new Date("2026-01-02T10:00:00Z");
      prisma.threadParticipant.findMany.mockResolvedValue([
        {
          threadId: "t-old",
          lastReadAt: null,
          thread: {
            lastMessageAt: older,
            participants: [
              { userId: "me", user: { id: "me", name: "Me", username: null, image: null } },
              { userId: "u2", user: { id: "u2", name: "Bob", username: "bob", image: null } },
            ],
            messages: [{ id: "m1", content: "hi", createdAt: older, senderId: "u2" }],
            product: null,
          },
        },
        {
          threadId: "t-new",
          lastReadAt: null,
          thread: {
            lastMessageAt: newer,
            participants: [
              { userId: "me", user: { id: "me", name: "Me", username: null, image: null } },
              { userId: "u3", user: { id: "u3", name: "Cara", username: "cara", image: null } },
            ],
            messages: [{ id: "m2", content: "yo", createdAt: newer, senderId: "u3" }],
            product: { id: "p1", name: "iPhone", price: 320, images: [] },
          },
        },
      ]);
      prisma.message.groupBy.mockResolvedValue([
        { threadId: "t-new", _count: { _all: 2 } },
      ]);

      const threads = await service.listThreads("me");

      expect(prisma.message.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ["threadId"],
          where: {
            threadId: { in: ["t-old", "t-new"] },
            senderId: { not: "me" },
            readAt: null,
          },
        })
      );
      expect(threads[0].id).toBe("t-new");
      expect(threads[0].participants).toEqual([{ id: "u3", name: "Cara", username: "cara", image: null }]);
      expect(threads[0].unreadCount).toBe(2);
      expect(threads[1].id).toBe("t-old");
      expect(threads[1].unreadCount).toBe(0);
    });
  });

  describe("getMessages", () => {
    it("forbids non-participants", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      await expect(service.getMessages("t1", "intruder")).rejects.toThrow(ForbiddenException);
    });

    it("returns a cursor when more pages exist", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.message.findMany.mockResolvedValue([
        { id: "m3", content: "c" },
        { id: "m2", content: "b" },
        { id: "m1", content: "a" },
      ]);

      const result = await service.getMessages("t1", "me", undefined, 2);

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("m2");
    });
  });

  describe("markRead", () => {
    it("updates lastReadAt and stamps messages read", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });

      await service.markRead("t1", "me");

      expect(prisma.threadParticipant.update).toHaveBeenCalledWith({
        where: { threadId_userId: { threadId: "t1", userId: "me" } },
        data: { lastReadAt: expect.any(Date) },
      });
      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: { threadId: "t1", senderId: { not: "me" }, readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe("listOnlineContacts", () => {
    it("returns nothing when nobody is online", async () => {
      const svc = new ThreadsService(
        prisma as unknown as PrismaService,
        makeGateway([]) as unknown as ChatGateway,
        makeBot() as unknown as ChatBotService,
        makeNotifications() as unknown as NotificationsService
      );

      await expect(svc.listOnlineContacts("me")).resolves.toEqual([]);
      expect(prisma.threadParticipant.findMany).not.toHaveBeenCalled();
    });

    it("ranks online users by total messages across threads, excluding offline peers", async () => {
      const svc = new ThreadsService(
        prisma as unknown as PrismaService,
        makeGateway(["u2", "u3"]) as unknown as ChatGateway,
        makeBot() as unknown as ChatBotService,
        makeNotifications() as unknown as NotificationsService
      );
      prisma.threadParticipant.findMany.mockResolvedValue([
        {
          thread: {
            lastMessageAt: new Date("2026-01-01T10:00:00Z"),
            _count: { messages: 10 },
            participants: [
              { userId: "me", user: {} },
              { userId: "u2", user: { id: "u2", name: "Bob", username: null, image: null } },
            ],
          },
        },
        {
          thread: {
            lastMessageAt: new Date("2026-02-01T10:00:00Z"),
            _count: { messages: 5 },
            participants: [
              { userId: "me", user: {} },
              { userId: "u2", user: { id: "u2", name: "Bob", username: null, image: null } },
            ],
          },
        },
        {
          thread: {
            lastMessageAt: new Date("2026-03-01T10:00:00Z"),
            _count: { messages: 7 },
            participants: [
              { userId: "me", user: {} },
              { userId: "u3", user: { id: "u3", name: "Cara", username: null, image: null } },
            ],
          },
        },
        {
          thread: {
            lastMessageAt: new Date("2026-04-01T10:00:00Z"),
            _count: { messages: 99 },
            participants: [
              { userId: "me", user: {} },
              { userId: "u4", user: { id: "u4", name: "Offline", username: null, image: null } },
            ],
          },
        },
      ]);

      const contacts = await svc.listOnlineContacts("me");

      expect(contacts).toHaveLength(2);
      expect(contacts[0].user.id).toBe("u2");
      expect(contacts[0].messageCount).toBe(15);
      expect(contacts[1].user.id).toBe("u3");
      expect(contacts[1].messageCount).toBe(7);
    });
  });

  describe("searchPeople", () => {
    it("returns nothing for queries shorter than 2 characters", async () => {
      await expect(service.searchPeople("me", "a")).resolves.toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it("matches by name/username case-insensitively, excluding self and the bot", async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: "me", name: "Me", username: "me", image: null },
        { id: "bot-id", name: "Champey Bot", username: "champeybot", image: null },
        { id: "u2", name: "Bobby", username: "bob", image: null },
        { id: "u3", name: "ALICE", username: "alice", image: null },
      ]);
      const svc = new ThreadsService(
        prisma as unknown as PrismaService,
        makeGateway(["u2", "bot-id"]) as unknown as ChatGateway,
        makeBot() as unknown as ChatBotService,
        makeNotifications() as unknown as NotificationsService
      );

      const results = await svc.searchPeople("me", "BOB");

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ id: "u2", name: "Bobby", online: true });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { notIn: ["me", "bot-id"] } }),
        })
      );
    });
  });

  describe("createConversation", () => {
    it("rejects an empty or self-only/bot-only selection", async () => {
      await expect(service.createConversation("me", [])).rejects.toThrow(BadRequestException);
      await expect(
        service.createConversation("me", ["me", "bot-id"])
      ).rejects.toThrow(BadRequestException);
      expect(prisma.thread.create).not.toHaveBeenCalled();
    });

    it("routes a single peer to the existing DM find-or-create", async () => {
      prisma.user.findMany.mockResolvedValue([{ id: "u2" }]);
      prisma.user.findUnique.mockResolvedValue({ id: "u2" });
      prisma.thread.findFirst.mockResolvedValue({ id: "t-dm" });

      const result = await service.createConversation("me", ["u2"]);

      expect(result).toEqual({ id: "t-dm", kind: "DM", created: false });
      expect(prisma.thread.create).not.toHaveBeenCalled();
    });

    it("creates a 3+ person group conversation when none exists", async () => {
      prisma.user.findMany.mockResolvedValue([{ id: "u2" }, { id: "u3" }]);
      prisma.thread.findMany.mockResolvedValue([]);
      prisma.thread.create.mockResolvedValue({ id: "t-new" });

      const result = await service.createConversation("me", ["u2", "u3"]);

      expect(result).toEqual({ id: "t-new", kind: "GROUP_CHAT", created: true });
      expect(prisma.thread.create).toHaveBeenCalledWith({
        data: {
          participants: {
            create: [{ userId: "me" }, { userId: "u2" }, { userId: "u3" }],
          },
        },
        select: { id: true },
      });
    });

    it("reuses an existing conversation with the exact same member set", async () => {
      prisma.user.findMany.mockResolvedValue([{ id: "u2" }, { id: "u3" }]);
      prisma.thread.findMany.mockResolvedValue([
        {
          id: "t-existing",
          participants: [
            { userId: "me" },
            { userId: "u2" },
            { userId: "u3" },
          ],
        },
      ]);

      const result = await service.createConversation("me", ["u2", "u3"]);

      expect(result).toEqual({ id: "t-existing", kind: "GROUP_CHAT", created: false });
      expect(prisma.thread.create).not.toHaveBeenCalled();
    });
  });

  describe("addParticipants", () => {
    it("forbids non-participants", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      await expect(service.addParticipants("me", "t1", ["u2"])).rejects.toThrow(
        ForbiddenException
      );
    });

    it("refuses to mutate product or community-group threads", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.thread.findUnique.mockResolvedValue({
        id: "t1",
        productId: "p1",
        groupId: null,
        participants: [{ userId: "me" }],
      });
      await expect(service.addParticipants("me", "t1", ["u2"])).rejects.toThrow(
        BadRequestException
      );
    });

    it("adds valid new members and notifies each of them", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.thread.findUnique.mockResolvedValue({
        id: "t1",
        productId: null,
        groupId: null,
        participants: [{ userId: "me" }, { userId: "u2" }],
      });
      prisma.user.findMany.mockResolvedValue([{ id: "u3" }, { id: "u4" }]);
      prisma.threadParticipant.create.mockResolvedValue({ id: "new" });
      const notifications = makeNotifications();
      const svc = new ThreadsService(
        prisma as unknown as PrismaService,
        makeGateway() as unknown as ChatGateway,
        makeBot() as unknown as ChatBotService,
        notifications as unknown as NotificationsService
      );

      const result = await svc.addParticipants("me", "t1", ["u3", "u4"]);

      expect(result).toEqual({ added: 2, participantCount: 4 });
      expect(prisma.threadParticipant.create).toHaveBeenCalledTimes(2);
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u3", kind: "MESSAGE", entityId: "t1" })
      );
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u4", kind: "MESSAGE", entityId: "t1" })
      );
    });
  });

  describe("leaveConversation", () => {
    it("keeps the conversation when at least two people remain", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.thread.findUnique.mockResolvedValue({
        id: "t1",
        productId: null,
        groupId: null,
      });
      prisma.threadParticipant.findMany.mockResolvedValue([
        { userId: "me" },
        { userId: "u2" },
        { userId: "u3" },
      ]);
      prisma.threadParticipant.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.leaveConversation("me", "t1");

      expect(result).toEqual({ left: true, deleted: false, participantCount: 2 });
      expect(prisma.threadParticipant.deleteMany).toHaveBeenCalledWith({
        where: { threadId: "t1", userId: "me" },
      });
      expect(prisma.thread.delete).not.toHaveBeenCalled();
    });

    it("deletes a 2-person chat when one person leaves", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.thread.findUnique.mockResolvedValue({
        id: "t1",
        productId: null,
        groupId: null,
      });
      prisma.threadParticipant.findMany.mockResolvedValue([
        { userId: "me" },
        { userId: "u2" },
      ]);
      prisma.threadParticipant.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.leaveConversation("me", "t1");

      expect(result).toEqual({ left: true, deleted: true });
      expect(prisma.thread.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
    });

    it("refuses to leave product or community-group threads", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.thread.findUnique.mockResolvedValue({
        id: "t1",
        productId: null,
        groupId: "g1",
      });
      await expect(service.leaveConversation("me", "t1")).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("listThreads kinds", () => {
    it("labels multi-person personal threads as GROUP_CHAT", async () => {
      prisma.threadParticipant.findMany.mockResolvedValue([
        {
          threadId: "t-g",
          lastReadAt: null,
          thread: {
            lastMessageAt: new Date("2026-01-01T10:00:00Z"),
            participants: [
              { userId: "me", user: { id: "me", name: "Me", username: null, image: null } },
              { userId: "u2", user: { id: "u2", name: "Bob", username: null, image: null } },
              { userId: "u3", user: { id: "u3", name: "Cara", username: null, image: null } },
            ],
            messages: [],
            product: null,
          },
        },
      ]);
      prisma.message.groupBy.mockResolvedValue([]);

      const threads = await service.listThreads("me");

      expect(threads[0].kind).toBe("GROUP_CHAT");
      expect(threads[0].participantCount).toBe(3);
      expect(threads[0].participants.map((p) => p.id)).toEqual(["u2", "u3"]);
    });
  });
});
