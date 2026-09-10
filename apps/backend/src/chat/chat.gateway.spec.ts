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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pageMember: {
      findUnique: vi.fn(),
    },
    supportTicket: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    supportMessage: {
      create: vi.fn(),
      updateMany: vi.fn(),
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
      // Non-page thread: thread.findUnique returns pageId null → access denied
      prisma.thread.findUnique.mockResolvedValue({ pageId: null });
      const client = makeClient("u1");

      await gateway.handleJoinThread(client as never, { threadId: "t1" });

      expect(prisma.threadParticipant.findUnique).toHaveBeenCalledWith({
        where: { threadId_userId: { threadId: "t1", userId: "u1" } },
        select: { id: true },
      });
      expect(prisma.thread.findUnique).toHaveBeenCalledWith({
        where: { id: "t1" },
        select: { pageId: true },
      });
      expect(prisma.pageMember.findUnique).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it("joins the room when the socket belongs to a participant", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      const client = makeClient("u1");

      await gateway.handleJoinThread(client as never, { threadId: "t1" });

      expect(client.join).toHaveBeenCalledWith("t1");
    });

    it("allows page OWNER to join a customer thread as non-participant", async () => {
      // User is not a thread participant
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      // It's a page thread
      prisma.thread.findUnique.mockResolvedValue({ pageId: "pg1" });
      // User is the page OWNER
      prisma.pageMember.findUnique.mockResolvedValue({ id: "pm1" });
      const client = makeClient("page-owner-1");

      await gateway.handleJoinThread(client as never, { threadId: "t1" });

      expect(prisma.pageMember.findUnique).toHaveBeenCalledWith({
        where: { pageId_userId: { pageId: "pg1", userId: "page-owner-1" } },
        select: { id: true },
      });
      expect(client.join).toHaveBeenCalledWith("t1");
    });

    it("allows page EDITOR to join a customer thread as non-participant", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      prisma.thread.findUnique.mockResolvedValue({ pageId: "pg1" });
      prisma.pageMember.findUnique.mockResolvedValue({ id: "pm2" });
      const client = makeClient("page-editor-1");

      await gateway.handleJoinThread(client as never, { threadId: "t1" });

      expect(client.join).toHaveBeenCalledWith("t1");
    });

    it("blocks a non-member from joining a page thread", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      prisma.thread.findUnique.mockResolvedValue({ pageId: "pg1" });
      prisma.pageMember.findUnique.mockResolvedValue(null); // not a member
      const client = makeClient("outsider-1");

      await gateway.handleJoinThread(client as never, { threadId: "t1" });

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe("sendMessage", () => {
    it("ignores a message sent by a non-participant (nothing persisted or broadcast)", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      // Non-page thread
      prisma.thread.findUnique.mockResolvedValue({ pageId: null });
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
      // After persist, bot check: non-page thread → bot replies allowed
      prisma.thread.findUnique.mockResolvedValue({ pageId: null });
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

    it("allows page staff to send a message to a customer thread", async () => {
      // Staff is not a participant but IS a page member
      prisma.threadParticipant.findUnique.mockResolvedValue(null);
      prisma.thread.findUnique
        .mockResolvedValueOnce({ pageId: "pg1" })           // assertThreadAccess
        .mockResolvedValueOnce({ pageId: "pg1", page: { ownerId: "page-owner-1" } }); // persistAndBroadcast PAGE_MESSAGE check
      prisma.pageMember.findUnique.mockResolvedValue({ id: "pm1" });
      prisma.message.create.mockResolvedValue({
        id: "m2",
        threadId: "t1",
        senderId: "page-owner-1",
        content: "Thanks for your order!",
        sender: { id: "page-owner-1", name: "Shop Owner", image: null },
      });
      prisma.thread.update.mockResolvedValue({});
      // Staff sender is the page owner → PAGE_MESSAGE not sent
      prisma.threadParticipant.update.mockResolvedValue({});
      prisma.threadParticipant.findMany.mockResolvedValue([
        { userId: "customer-1" },
      ]);
      const client = makeClient("page-owner-1");

      await gateway.handleSendMessage(client as never, {
        threadId: "t1",
        content: "Thanks for your order!",
      });

      expect(prisma.message.create).toHaveBeenCalled();
      expect(room.emit).toHaveBeenCalledWith(
        "newMessage",
        expect.objectContaining({ id: "m2" })
      );
      // Customer participant gets notified
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "customer-1",
          kind: "MESSAGE",
        })
      );
    });

    it("sends PAGE_MESSAGE notification when customer messages a page thread", async () => {
      // Customer IS a participant
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.message.create.mockResolvedValue({
        id: "m3",
        threadId: "t1",
        senderId: "customer-1",
        content: "Is this still available?",
        sender: { id: "customer-1", name: "Buyer", image: null },
      });
      prisma.thread.update.mockResolvedValue({});
      prisma.threadParticipant.update.mockResolvedValue({});
      // No other participants (customer is the only one besides staff)
      prisma.threadParticipant.findMany.mockResolvedValue([]);
      // persistAndBroadcast PAGE_MESSAGE check: page thread + customer sender
      prisma.thread.findUnique.mockResolvedValue({
        pageId: "pg1",
        page: { ownerId: "page-owner-1" },
      });
      const client = makeClient("customer-1");

      await gateway.handleSendMessage(client as never, {
        threadId: "t1",
        content: "Is this still available?",
      });

      expect(prisma.message.create).toHaveBeenCalled();
      // PAGE_MESSAGE notification to the page owner
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "page-owner-1",
          actorId: "customer-1",
          kind: "PAGE_MESSAGE",
          entityId: "t1",
          message: "Is this still available?",
        })
      );
    });

    it("does not send PAGE_MESSAGE when staff sends in a page thread", async () => {
      // Staff is a participant
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.message.create.mockResolvedValue({
        id: "m4",
        threadId: "t1",
        senderId: "page-owner-1",
        content: "Yes, it is!",
        sender: { id: "page-owner-1", name: "Shop Owner", image: null },
      });
      prisma.thread.update.mockResolvedValue({});
      prisma.threadParticipant.update.mockResolvedValue({});
      prisma.threadParticipant.findMany.mockResolvedValue([
        { userId: "customer-1" },
      ]);
      // persistAndBroadcast: page thread, but sender IS the owner → skip PAGE_MESSAGE
      prisma.thread.findUnique.mockResolvedValue({
        pageId: "pg1",
        page: { ownerId: "page-owner-1" },
      });
      const client = makeClient("page-owner-1");

      await gateway.handleSendMessage(client as never, {
        threadId: "t1",
        content: "Yes, it is!",
      });

      // Only MESSAGE notification to customer, no PAGE_MESSAGE
      expect(notifications.notify).toHaveBeenCalledTimes(1);
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "customer-1", kind: "MESSAGE" })
      );
    });

    it("does not trigger bot reply in page threads", async () => {
      prisma.threadParticipant.findUnique.mockResolvedValue({ id: "tp1" });
      prisma.message.create.mockResolvedValue({
        id: "m5",
        threadId: "t1",
        senderId: "customer-1",
        content: "hello",
        sender: { id: "customer-1", name: "Buyer", image: null },
      });
      prisma.thread.update.mockResolvedValue({});
      prisma.threadParticipant.update.mockResolvedValue({});
      prisma.threadParticipant.findMany.mockResolvedValue([]);
      // It's a page thread → bot should NOT reply
      prisma.thread.findUnique.mockResolvedValue({ pageId: "pg1" });
      const client = makeClient("customer-1");

      await gateway.handleSendMessage(client as never, {
        threadId: "t1",
        content: "hello",
      });

      // Bot should never be consulted
      expect(bot.shouldRespond).not.toHaveBeenCalled();
      expect(bot.buildReplies).not.toHaveBeenCalled();
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

  describe("markSupportAsRead", () => {
    it("ignores markSupportAsRead from a user who is neither the customer nor an admin", async () => {
      prisma.user.findUnique.mockResolvedValue({ role: "CUSTOMER" });
      prisma.supportTicket.findFirst.mockResolvedValue(null);
      const client = makeClient("u9");

      await gateway.handleMarkSupportAsRead(client as never, { ticketId: "tk1" });

      // Non-admins are scoped to tickets they own, so u9 finds nothing.
      expect(prisma.supportTicket.findFirst).toHaveBeenCalledWith({
        where: { id: "tk1", customerId: "u9" },
        select: { id: true },
      });
      expect(prisma.supportMessage.updateMany).not.toHaveBeenCalled();
      expect(server.to).not.toHaveBeenCalled();
    });

    it("marks the ticket's messages read for the owning customer", async () => {
      prisma.user.findUnique.mockResolvedValue({ role: "CUSTOMER" });
      prisma.supportTicket.findFirst.mockResolvedValue({ id: "tk1" });
      prisma.supportMessage.updateMany.mockResolvedValue({ count: 2 });
      const client = makeClient("u1");

      await gateway.handleMarkSupportAsRead(client as never, { ticketId: "tk1" });

      expect(prisma.supportTicket.findFirst).toHaveBeenCalledWith({
        where: { id: "tk1", customerId: "u1" },
        select: { id: true },
      });
      expect(prisma.supportMessage.updateMany).toHaveBeenCalledWith({
        where: { ticketId: "tk1", senderId: { not: "u1" }, readAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(server.to).toHaveBeenCalledWith("support:tk1");
      expect(room.emit).toHaveBeenCalledWith("supportMessagesRead", {
        userId: "u1",
        ticketId: "tk1",
      });
    });

    it("lets an admin mark any ticket as read", async () => {
      prisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
      prisma.supportTicket.findUnique.mockResolvedValue({ id: "tk1" });
      prisma.supportMessage.updateMany.mockResolvedValue({ count: 5 });
      const client = makeClient("admin-1");

      await gateway.handleMarkSupportAsRead(client as never, { ticketId: "tk1" });

      expect(prisma.supportTicket.findUnique).toHaveBeenCalledWith({
        where: { id: "tk1" },
        select: { id: true },
      });
      expect(prisma.supportTicket.findFirst).not.toHaveBeenCalled();
      expect(prisma.supportMessage.updateMany).toHaveBeenCalled();
      expect(server.to).toHaveBeenCalledWith("support:tk1");
      expect(room.emit).toHaveBeenCalledWith("supportMessagesRead", {
        userId: "admin-1",
        ticketId: "tk1",
      });
    });
  });
});
