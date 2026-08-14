import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: uid } });

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { buyerId: uid },
        ...(sellerProfile ? [{ sellerId: sellerProfile.id }] : []),
      ],
    },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { include: { user: { select: { id: true, name: true, email: true } } } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          messages: {
            where: { senderId: { not: uid }, readAt: null },
          },
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { sellerId, productId, message } = body;
  const pid = productId || null;

  if (typeof sellerId !== "string" || !sellerId.trim()) {
    return NextResponse.json({ error: "Seller is required" }, { status: 400 });
  }

  if (message !== undefined && message !== null) {
    if (typeof message !== "string") {
      return NextResponse.json({ error: "Message must be a string" }, { status: 400 });
    }
    if (message.trim().length > 2000) {
      return NextResponse.json({ error: "Message is too long (max 2000 characters)" }, { status: 400 });
    }
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!sellerProfile) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  if (sellerProfile.userId === uid) {
    return NextResponse.json({ error: "Cannot chat with yourself" }, { status: 400 });
  }

  const [conversation] = await prisma.$transaction(async (tx) => {
    const existing = await tx.conversation.findFirst({
      where: { buyerId: uid, sellerId, productId: pid },
    });

    if (existing) {
      if (message?.trim()) {
        await tx.message.create({
          data: { conversationId: existing.id, senderId: uid, content: message },
        });
        await tx.conversation.update({
          where: { id: existing.id },
          data: { lastMessageAt: new Date() },
        });
      }
      return [existing];
    }

    const conversation = await tx.conversation.create({
      data: {
        buyerId: uid,
        sellerId,
        productId: pid,
        ...(message?.trim()
          ? {
              lastMessageAt: new Date(),
              messages: {
                create: { senderId: uid, content: message },
              },
            }
          : {}),
      },
    });

    return [conversation];
  });

  return NextResponse.json(conversation, conversation.createdAt ? { status: 201 } : {});
}
