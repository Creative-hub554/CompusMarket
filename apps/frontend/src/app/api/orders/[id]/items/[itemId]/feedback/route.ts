import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const { id, itemId } = await params;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { rating, comment, images } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item || item.orderId !== id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (item.status !== "DELIVERED") {
    return NextResponse.json({ error: "Can only review delivered items" }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({ where: { orderItemId: itemId } });
  if (existing) {
    return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      rating,
      comment: comment || null,
      images: images || [],
      userId: uid,
      productId: item.productId,
      orderItemId: itemId,
    },
  });

  return NextResponse.json(review, { status: 201 });
}
