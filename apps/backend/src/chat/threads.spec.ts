import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ThreadsService } from "./threads.service";
import { PrismaService } from "../prisma/prisma.service";

function makePrisma() {
  return {
    thread: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    threadParticipant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
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
    },
  };
}

describe("ThreadsService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ThreadsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    service = new ThreadsService(prisma as unknown as PrismaService);
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
});
