import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import { prisma, OrderStatus, Prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const orders = await prisma.order.findMany({
    where: { userId: uid },
    include: { items: { include: { product: true, feedback: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
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
      const result = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        throw new Error(`Insufficient stock for ${item.product.name || "product"}`);
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

    const warrantyRows: Prisma.WarrantyCreateManyInput[] = [];
    for (const orderItem of order.items) {
      const product = cart.items.find((i) => i.productId === orderItem.productId)?.product;
      const months = product?.warrantyMonths;
      if (!product || !months || months <= 0) continue;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);
      warrantyRows.push({
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        userId: uid,
        months,
        startDate,
        endDate,
      });
    }
    if (warrantyRows.length > 0) {
      await tx.warranty.createMany({ data: warrantyRows });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return [order];
  });

  return NextResponse.json(order, { status: 201 });
}
