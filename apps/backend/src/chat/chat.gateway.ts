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

@WebSocketGateway({
  cors: { origin: "*", credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  constructor(private prisma: PrismaService) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const token = client.handshake.query.token as string;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = verify(token, JWT_SECRET!) as { sub: string };
      (client as any).userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage("joinConversation")
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId) return;

      const conversation = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
        include: { seller: { select: { id: true, userId: true } } },
      });
      if (!conversation) return;

      const isBuyer = conversation.buyerId === userId;
      const isSeller = conversation.seller.userId === userId;
      if (!isBuyer && !isSeller) return;

      client.join(data.conversationId);
    } catch (err) {
      console.error("ChatGateway error:", err);
    }
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId || !data.content?.trim() || data.content.length > 5000) return;

      const conversation = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
        include: { seller: { select: { id: true, userId: true } } },
      });
      if (!conversation) return;

      const isBuyer = conversation.buyerId === userId;
      const isSeller = conversation.seller.userId === userId;
      if (!isBuyer && !isSeller) return;

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
      console.error("ChatGateway error:", err);
    }
  }

  @SubscribeMessage("markAsRead")
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId) return;

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
      console.error("ChatGateway error:", err);
    }
  }

  @SubscribeMessage("joinSupportTicket")
  async handleJoinSupportTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    try {
      const userId = (client as any).userId;
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
      console.error("ChatGateway error:", err);
    }
  }

  @SubscribeMessage("sendSupportMessage")
  async handleSendSupportMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; content: string },
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId || !data.content?.trim() || data.content.length > 5000) return;

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
      console.error("ChatGateway error:", err);
    }
  }

  @SubscribeMessage("markSupportAsRead")
  async handleMarkSupportAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId) return;

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
      console.error("ChatGateway error:", err);
    }
  }
}
