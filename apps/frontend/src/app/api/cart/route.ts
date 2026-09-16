import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let cart = await prisma.cart.findUnique({
    where: { userId: token.sub },
    include: { items: { include: { product: true } } },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: token.sub },
      include: { items: { include: { product: true } } },
    });
  }

  return NextResponse.json(cart);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { productId, quantity = 1 } = body;

  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0 || quantity > 999) {
    return NextResponse.json({ error: "Quantity must be a positive integer (1-999)" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (product.status !== "ACTIVE") return NextResponse.json({ error: "Product is not available" }, { status: 400 });
  if (product.stock <= 0) return NextResponse.json({ error: "Product is out of stock" }, { status: 400 });
  if (quantity > Math.min(product.stock, 99)) {
    return NextResponse.json({ error: "Quantity exceeds available stock" }, { status: 400 });
  }

  const userId = token.sub as string;
  const [item] = await prisma.$transaction(async (tx) => {
    let cart = await tx.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await tx.cart.create({ data: { userId } });
    }

    await tx.$queryRaw`SELECT id FROM "Cart" WHERE "id" = ${cart.id} FOR UPDATE`;
    const existing = await tx.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    let item;
    if (existing) {
      const newQuantity = Math.min(existing.quantity + quantity, product.stock, 99);
      item = await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
        include: { product: true },
      });
    } else {
      if (quantity > product.stock) {
        throw new Error("Quantity exceeds available stock");
      }
      item = await tx.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
        include: { product: true },
      });
    }

    return [item];
  });

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cart = await prisma.cart.findUnique({ where: { userId: token.sub } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  return NextResponse.json({ success: true });
}
