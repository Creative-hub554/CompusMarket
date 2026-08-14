import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Missing JWT secret: set AUTH_SECRET or JWT_SECRET env var");
}

const MESSAGE_RATE_LIMIT = 20;
const MESSAGE_RATE_WINDOW_MS = 60 * 1000;

type AuthenticatedSocket = Socket & { userId?: string };

@WebSocketGateway({
  cors: { origin: "*", credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);
  private messageTimestamps = new Map<string, number[]>();

  constructor(private prisma: PrismaService) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
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
      (client as AuthenticatedSocket).userId = payload.sub;
    } catch {
      this.logger.warn("Rejected socket connection: invalid token");
      client.disconnect();
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

  @SubscribeMessage("joinConversation")
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) return;

      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: data.conversationId,
          OR: [{ buyerId: userId }, { seller: { userId } }],
        },
      });
      if (!conversation) return;

      client.join(data.conversationId);
    } catch (err) {
      this.logger.error("ChatGateway error:", err as Error);
    }
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId || !data.content?.trim() || data.content.length > 5000) return;

      if (this.isRateLimited(userId)) {
        client.emit("error", { message: "Message rate limit exceeded. Please slow down." });
        return;
      }

      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: data.conversationId,
          OR: [{ buyerId: userId }, { seller: { userId } }],
        },
      });
      if (!conversation) return;

      const message = await this.prisma.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: userId,
          content: data.content,
        },
      });

      await this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessageAt: new Date() },
      });

      this.server.to(data.conversationId).emit("newMessage", message);
    } catch (err) {
      this.logger.error("ChatGateway error:", err as Error);
    }
  }

  @SubscribeMessage("markAsRead")
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) return;

      // Only participants of the conversation may mark its messages as read.
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: data.conversationId,
          OR: [{ buyerId: userId }, { seller: { userId } }],
        },
      });
      if (!conversation) return;

      await this.prisma.message.updateMany({
        where: {
          conversationId: data.conversationId,
          senderId: { not: userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      this.server.to(data.conversationId).emit("messagesRead", { userId });
    } catch (err) {
      this.logger.error("ChatGateway error:", err as Error);
    }
  }

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
      });
      if (!ticket) return;

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
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
      });
      if (!ticket) return;

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
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
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const ticket =
        user.role === "ADMIN"
          ? await this.prisma.supportTicket.findUnique({ where: { id: data.ticketId } })
          : await this.prisma.supportTicket.findFirst({
              where: { id: data.ticketId, customerId: userId },
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