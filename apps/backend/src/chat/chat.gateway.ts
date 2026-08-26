import { Logger, OnModuleInit } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../social/notifications.service";
import { notificationEvents, NOTIFICATION_CREATED } from "../realtime/notification.events";
import { verify } from "jsonwebtoken";
import { getAuthSecret, getCorsOrigins } from "../common/config";

const JWT_SECRET = getAuthSecret();

const MESSAGE_RATE_LIMIT = 20;
const MESSAGE_RATE_WINDOW_MS = 60 * 1000;

type AuthenticatedSocket = Socket & { userId?: string };

interface MessageAttachmentInput {
  url?: unknown;
  kind?: unknown;
}

function sanitizeAttachments(input: unknown): { url: string; kind: string }[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const cleaned: { url: string; kind: string }[] = [];
  for (const item of input.slice(0, 8)) {
    if (typeof item !== "object" || item === null) continue;
    const { url, kind } = item as MessageAttachmentInput;
    if (typeof url !== "string" || !url) continue;
    if (kind !== "IMAGE" && kind !== "VIDEO") continue;
    cleaned.push({ url, kind });
  }
  return cleaned.length > 0 ? cleaned : undefined;
}

@WebSocketGateway({
  cors: { origin: getCorsOrigins(), credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly logger = new Logger(ChatGateway.name);
  private messageTimestamps = new Map<string, number[]>();
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  onModuleInit() {
    notificationEvents.removeAllListeners(NOTIFICATION_CREATED);
    notificationEvents.on(NOTIFICATION_CREATED, (n: { userId: string }) => {
      this.emitToUser(n.userId, "notification", n);
    });
  }

  onModuleDestroy() {
    notificationEvents.removeAllListeners(NOTIFICATION_CREATED);
  }

  @WebSocketServer()
  server!: Server;

  handleConnection(client: AuthenticatedSocket) {
    // Prefer the token from handshake.auth; keep the query-string fallback
    // for backward compatibility with older clients.
    const authToken = (client.handshake.auth as { token?: string } | undefined)?.token;
    const token = authToken || (client.handshake.query.token as string | undefined);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = verify(token, JWT_SECRET!) as { sub: string };
      client.userId = payload.sub;
      this.addPresence(client.id, payload.sub);
    } catch {
      this.logger.warn("Rejected socket connection: invalid token");
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.removePresence(client.id, client.userId);
    }
  }

  // ── Presence ──

  private addPresence(socketId: string, userId: string): void {
    let sockets = this.onlineUsers.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.onlineUsers.set(userId, sockets);
    }
    sockets.add(socketId);
    this.server.emit("presence", { userId, online: true });
  }

  private removePresence(socketId: string, userId: string): void {
    const sockets = this.onlineUsers.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.onlineUsers.delete(userId);
      this.server.emit("presence", { userId, online: false });
    }
  }

  private emitToUser(userId: string, event: string, payload: unknown): void {
    const sockets = this.onlineUsers.get(userId);
    if (!sockets) return;
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  private isRateLimited(userId: string): boolean {
    const now = Date.now();
    const timestamps = (this.messageTimestamps.get(userId) || []).filter(
      (t) => now - t < MESSAGE_RATE_WINDOW_MS,
    );
    if (timestamps.length >= MESSAGE_RATE_LIMIT) {
      this.messageTimestamps.set(userId, timestamps);
      return true;
    }
    timestamps.push(now);
    this.messageTimestamps.set(userId, timestamps);
    return false;
  }

  @SubscribeMessage("presenceSnapshot")
  handlePresenceSnapshot(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit("presenceSnapshot", { online: [...this.onlineUsers.keys()] });
  }

  // ── Threads ──

  @SubscribeMessage("joinThread")
  async handleJoinThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) return;

      const participant = await this.prisma.threadParticipant.findUnique({
        where: { threadId_userId: { threadId: data.threadId, userId } },
        select: { id: true },
      });
      if (!participant) return;

      client.join(data.threadId);
    } catch (err) {
      this.logger.error("ChatGateway error:", err as Error);
    }
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string; content: string; attachments?: unknown },
  ) {
    try {
      const userId = client.userId;
      const content = data.content?.trim() ?? "";
      const attachments = sanitizeAttachments(data.attachments);
      if (
        !userId ||
        (!content && !attachments) ||
        content.length > 5000
      ) {
        return;
      }

      if (this.isRateLimited(userId)) {
        client.emit("error", { message: "Message rate limit exceeded. Please slow down." });
        return;
      }

      const participant = await this.prisma.threadParticipant.findUnique({
        where: { threadId_userId: { threadId: data.threadId, userId } },
        select: { id: true },
      });
      if (!participant) return;

      const message = await this.prisma.message.create({
        data: {
          threadId: data.threadId,
          senderId: userId,
          content,
          ...(attachments ? { attachments } : {}),
        },
        include: { sender: { select: { id: true, name: true, image: true } } },
      });

      await Promise.all([
        this.prisma.thread.update({
          where: { id: data.threadId },
          data: { lastMessageAt: new Date() },
        }),
        this.prisma.threadParticipant.update({
          where: { threadId_userId: { threadId: data.threadId, userId } },
          data: { lastReadAt: new Date() },
        }),
      ]);

      this.server.to(data.threadId).emit("newMessage", message);

      const otherParticipants = await this.prisma.threadParticipant.findMany({
        where: { threadId: data.threadId, userId: { not: userId } },
        select: { userId: true },
      });
      await Promise.all(
        otherParticipants.map((p) =>
          this.notifications.notify({
            userId: p.userId,
            actorId: userId,
            kind: "MESSAGE",
            entityId: data.threadId,
            message: content || "Sent an attachment",
          })
        )
      );
    } catch (err) {
      this.logger.error("ChatGateway error:", err as Error);
    }
  }

  @SubscribeMessage("typing")
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string; typing: boolean },
  ) {
    const userId = client.userId;
    if (!userId) return;
    const participant = await this.prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId: data.threadId, userId } },
      select: { id: true },
    });
    if (!participant) return;
    client.to(data.threadId).emit("typing", {
      threadId: data.threadId,
      userId,
      typing: !!data.typing,
    });
  }

  @SubscribeMessage("markAsRead")
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) return;

      const participant = await this.prisma.threadParticipant.findUnique({
        where: { threadId_userId: { threadId: data.threadId, userId } },
        select: { id: true },
      });
      if (!participant) return;

      await this.prisma.threadParticipant.update({
        where: { threadId_userId: { threadId: data.threadId, userId } },
        data: { lastReadAt: new Date() },
      });
      await this.prisma.message.updateMany({
        where: {
          threadId: data.threadId,
          senderId: { not: userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      this.server.to(data.threadId).emit("messagesRead", { userId });
    } catch (err) {
      this.logger.error("ChatGateway error:", err as Error);
    }
  }

  // ── Support tickets (unchanged behavior) ──

  @SubscribeMessage("joinSupportTicket")
  async handleJoinSupportTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) return;

      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: data.ticketId },
        select: { customerId: true },
      });
      if (!ticket) return;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isCustomer = ticket.customerId === userId;
      const isAdmin = user?.role === "ADMIN";
      if (!isCustomer && !isAdmin) return;

      const room = `support:${data.ticketId}`;
      client.join(room);
    } catch (err) {
      this.logger.error("ChatGateway error:", err as Error);
    }
  }

  @SubscribeMessage("sendSupportMessage")
  async handleSendSupportMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string; content: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId || !data.content?.trim() || data.content.length > 5000) return;

      if (this.isRateLimited(userId)) {
        client.emit("error", { message: "Message rate limit exceeded. Please slow down." });
        return;
      }

      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: data.ticketId },
        select: { customerId: true },
      });
      if (!ticket) return;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isCustomer = ticket.customerId === userId;
      const isAdmin = user?.role === "ADMIN";
      if (!isCustomer && !isAdmin) return;

      const message = await this.prisma.supportMessage.create({
        data: {
          ticketId: data.ticketId,
          senderId: userId,
          content: data.content,
        },
        include: { sender: { select: { id: true, name: true, role: true } } },
      });

      await this.prisma.supportTicket.update({
        where: { id: data.ticketId },
        data: { updatedAt: new Date() },
      });

      const room = `support:${data.ticketId}`;
      this.server.to(room).emit("newSupportMessage", message);
    } catch (err) {
      this.logger.error("ChatGateway error:", err as Error);
    }
  }

  @SubscribeMessage("markSupportAsRead")
  async handleMarkSupportAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ticketId: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) return;

      // Only the ticket customer (or an admin) may mark its messages as read.
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!user) return;

      const ticket =
        user.role === "ADMIN"
          ? await this.prisma.supportTicket.findUnique({
              where: { id: data.ticketId },
              select: { id: true },
            })
          : await this.prisma.supportTicket.findFirst({
              where: { id: data.ticketId, customerId: userId },
              select: { id: true },
            });
      if (!ticket) return;

      await this.prisma.supportMessage.updateMany({
        where: {
          ticketId: data.ticketId,
          senderId: { not: userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      const room = `support:${data.ticketId}`;
      this.server.to(room).emit("supportMessagesRead", { userId, ticketId: data.ticketId });
    } catch (err) {
      this.logger.error("ChatGateway error:", err as Error);
    }
  }
}
