import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, OrderStatus } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const orders = await prisma.order.findMany({
    where: { userId: uid },
    include: { items: { include: { product: true, feedback: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const cart = await prisma.cart.findUnique({
    where: { userId: uid },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const total = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );

  const [order] = await prisma.$transaction(async (tx) => {
    for (const item of cart.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.stock || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product?.name || "product"}`);
      }
    }

    for (const item of cart.items) {
      const result = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        throw new Error(`Insufficient stock for item in cart`);
      }
    }

    const order = await tx.order.create({
      data: {
        userId: uid,
        total,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    for (const orderItem of order.items) {
      const product = cart.items.find((i) => i.productId === orderItem.productId)?.product;
      if (product?.warrantyMonths && product.warrantyMonths > 0) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + product.warrantyMonths);
        await tx.warranty.create({
          data: {
            orderItemId: orderItem.id,
            productId: orderItem.productId,
            userId: uid,
            months: product.warrantyMonths,
            startDate,
            endDate,
          },
        });
      }
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return [order];
  });

  return NextResponse.json(order, { status: 201 });
}
