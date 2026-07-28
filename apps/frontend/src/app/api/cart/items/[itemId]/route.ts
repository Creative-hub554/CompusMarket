import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const { itemId } = await params;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const quantity = parseInt(body.quantity);

  if (isNaN(quantity) || quantity < 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const cart = await prisma.cart.findUnique({ where: { userId: uid } });
  if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  }

  const updated = await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: { product: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const { itemId } = await params;

  const cart = await prisma.cart.findUnique({ where: { userId: uid } });
  if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await prisma.cartItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
