import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatGateway } from "./chat.gateway";
import type { PrismaService } from "../prisma/prisma.service";
import type { NotificationsService } from "../social/notifications.service";
import type { ChatBotService } from "./chat-bot.service";
import type { Server } from "socket.io";

// chat.gateway.ts resolves the auth secret at module scope, so seed the env
// before the static import above is evaluated.
vi.hoisted(() => {
  process.env.AUTH_SECRET = "test-auth-secret";
});

function makePrisma() {
  return {
    threadParticipant: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    message: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    thread: {
      update: vi.fn(),
    },
    supportTicket: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    supportMessage: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };
}

function makeServer() {
  return {
    emit: vi.fn(),
    to: vi.fn(),
  };
}

function makeClient(userId?: string) {
  return {
    id: "socket-1",
    userId,
    join: vi.fn(),
    emit: vi.fn(),
  };
}

describe("ChatGateway participant gating", () => {
  let gateway: ChatGateway;
  let prisma: ReturnType<typeof makePrisma>;
  let server: ReturnType<typeof makeServer>;
  let room: { emit: ReturnType<typeof vi.fn> };
  const bot = {
    shouldRespond: vi.fn(),
    getBotUserId: vi.fn(),
    buildReplies: vi.fn(),
  };
  const notifications = { notify: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    server = makeServer();
    room = { emit: vi.fn() };
    server.to.mockReturnValue(room as never);
    bot.shouldRespond.mockResolvedValue(false);

    gateway = new ChatGateway(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      bot as unknown as ChatBotService
    );
    gateway.server = server as unknown as Server;
  });

  describe("joinThread", () => {
    it("does not join a non-participant to the thread room", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      const client = makeClient("u1");

      await gateway.handleJoinThread(client as never, { threadId: "t1" });

      expect(prisma.threadParticipant.findUnique).toHaveBeenCalledWith({
        where: { threadId_userId: { threadId: "t1", userId: "u1" } },
        select: { id: true },
      });
      expect(client.join).not.toHaveBeenCalled();
    });

    it("joins the room when the socket belongs to a participant", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      const client = makeClient("u1");

      await gateway.handleJoinThread(client as never, { threadId: "t1" });

      expect(client.join).toHaveBeenCalledWith("t1");
    });
  });

  describe("sendMessage", () => {
    it("ignores a message sent by a non-participant (nothing persisted or broadcast)", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      const client = makeClient("u1");

      await gateway.handleSendMessage(client as never, {
        threadId: "t1",
        content: "hello",
      });

      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(prisma.thread.update).not.toHaveBeenCalled();
      expect(server.to).not.toHaveBeenCalled();
    });

    it("persists and broadcasts a message sent by a participant", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.message.create.mockResolvedValue({
        id: "m1",
        threadId: "t1",
        senderId: "u1",
        content: "hello",
        sender: { id: "u1", name: "Me", image: null },
      });
      prisma.thread.update.mockResolvedValue({});
      prisma.threadParticipant.update.mockResolvedValue({});
      prisma.threadParticipant.findMany.mockResolvedValue([]);
      const client = makeClient("u1");

      await gateway.handleSendMessage(client as never, {
        threadId: "t1",
        content: "hello",
      });

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ threadId: "t1", senderId: "u1", content: "hello" }),
        })
      );
      expect(server.to).toHaveBeenCalledWith("t1");
      expect(room.emit).toHaveBeenCalledWith(
        "newMessage",
        expect.objectContaining({ id: "m1" })
      );
      // No other participants -> no MESSAGE notifications.
      expect(notifications.notify).not.toHaveBeenCalled();
    });
  });

  describe("markAsRead", () => {
    it("ignores markAsRead from a non-participant", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      const client = makeClient("u1");

      await gateway.handleMarkAsRead(client as never, { threadId: "t1" });

      expect(prisma.threadParticipant.update).not.toHaveBeenCalled();
      expect(prisma.message.updateMany).not.toHaveBeenCalled();
      expect(server.to).not.toHaveBeenCalled();
    });

    it("marks messages read for a participant", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.threadParticipant.update.mockResolvedValue({});
      prisma.message.updateMany.mockResolvedValue({ count: 3 });
      const client = makeClient("u1");

      await gateway.handleMarkAsRead(client as never, { threadId: "t1" });

      expect(prisma.threadParticipant.update).toHaveBeenCalledWith({
        where: { threadId_userId: { threadId: "t1", userId: "u1" } },
        data: { lastReadAt: expect.any(Date) },
      });
      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: { threadId: "t1", senderId: { not: "u1" }, readAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(server.to).toHaveBeenCalledWith("t1");
      expect(room.emit).toHaveBeenCalledWith("messagesRead", { userId: "u1" });
    });
  });

  describe("joinSupportTicket", () => {
    it("does not join a user who is neither the customer nor an admin", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ customerId: "u1" });
      prisma.user.findUnique.mockResolvedValue({ role: "CUSTOMER" });
      const client = makeClient("u9");

      await gateway.handleJoinSupportTicket(client as never, { ticketId: "tk1" });

      expect(prisma.supportTicket.findUnique).toHaveBeenCalledWith({
        where: { id: "tk1" },
        select: { customerId: true },
      });
      expect(client.join).not.toHaveBeenCalled();
    });

    it("joins the ticket customer to the support room", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ customerId: "u1" });
      prisma.user.findUnique.mockResolvedValue({ role: "CUSTOMER" });
      const client = makeClient("u1");

      await gateway.handleJoinSupportTicket(client as never, { ticketId: "tk1" });

      expect(client.join).toHaveBeenCalledWith("support:tk1");
    });

    it("joins an admin to the support room even when they are not the customer", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ customerId: "u1" });
      prisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
      const client = makeClient("admin-1");

      await gateway.handleJoinSupportTicket(client as never, { ticketId: "tk1" });

      expect(client.join).toHaveBeenCalledWith("support:tk1");
    });
  });

  describe("sendSupportMessage", () => {
    it("ignores a message from a user who is neither the customer nor an admin", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ customerId: "u1" });
      prisma.user.findUnique.mockResolvedValue({ role: "CUSTOMER" });
      const client = makeClient("u9");

      await gateway.handleSendSupportMessage(client as never, {
        ticketId: "tk1",
        content: "hello?",
      });

      expect(prisma.supportMessage.create).not.toHaveBeenCalled();
      expect(prisma.supportTicket.update).not.toHaveBeenCalled();
      expect(server.to).not.toHaveBeenCalled();
    });

    it("persists and broadcasts a message from the ticket customer", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ customerId: "u1" });
      prisma.user.findUnique.mockResolvedValue({ role: "CUSTOMER" });
      prisma.supportMessage.create.mockResolvedValue({
        id: "sm1",
        ticketId: "tk1",
        senderId: "u1",
        content: "I need help",
        sender: { id: "u1", name: "Cust", role: "CUSTOMER" },
      });
      prisma.supportTicket.update.mockResolvedValue({});
      const client = makeClient("u1");

      await gateway.handleSendSupportMessage(client as never, {
        ticketId: "tk1",
        content: "I need help",
      });

      expect(prisma.supportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ticketId: "tk1", senderId: "u1", content: "I need help" }),
        })
      );
      expect(prisma.supportTicket.update).toHaveBeenCalledWith({
        where: { id: "tk1" },
        data: { updatedAt: expect.any(Date) },
      });
      expect(server.to).toHaveBeenCalledWith("support:tk1");
      expect(room.emit).toHaveBeenCalledWith(
        "newSupportMessage",
        expect.objectContaining({ id: "sm1" })
      );
    });

    it("allows an admin to reply even when they are not the customer", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ customerId: "u1" });
      prisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
      prisma.supportMessage.create.mockResolvedValue({ id: "sm2", senderId: "admin-1" });
      prisma.supportTicket.update.mockResolvedValue({});
      const client = makeClient("admin-1");

      await gateway.handleSendSupportMessage(client as never, {
        ticketId: "tk1",
        content: "We'll look into it",
      });

      expect(prisma.supportMessage.create).toHaveBeenCalled();
      expect(server.to).toHaveBeenCalledWith("support:tk1");
      expect(room.emit).toHaveBeenCalledWith(
        "newSupportMessage",
        expect.objectContaining({ id: "sm2" })
      );
    });
  });
});
