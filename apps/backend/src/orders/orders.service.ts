import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus, OrderItemStatus } from "@theo/database";

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}
  async checkout(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    const [order] = await this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.stock || product.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for ${product?.name || "product"}`);
        }
      }

      for (const item of cart.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new BadRequestException(`Insufficient stock for item in cart`);
        }
      }

      const total = cart.items.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0
      );

      const order = await tx.order.create({
        data: {
          userId,
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

      for (const item of cart.items) {
        if (item.product.warrantyMonths && item.product.warrantyMonths > 0) {
          const orderItem = order.items.find((oi) => oi.productId === item.productId);
          if (orderItem) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + item.product.warrantyMonths);
            await tx.warranty.create({
              data: {
                orderItemId: orderItem.id,
                productId: item.productId,
                userId,
                months: item.product.warrantyMonths,
                startDate,
                endDate,
              },
            });
          }
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return [order];
    });

    return order;
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        items: { include: { product: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: { select: { name: true, email: true } },
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.findOne(id);
    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Invalid order status transition: ${order.status} -> ${status}`,
      );
    }
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    });
  }

  async updateSellerStatus(id: string, userId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { sellerId: true } } } },
      },
    });
    if (!order) throw new NotFoundException("Order not found");

    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ForbiddenException("A seller profile is required to fulfill orders");
    }

    const ownedItemIds = order.items
      .filter((item) => item.product?.sellerId === profile.id)
      .map((item) => item.id);
    if (ownedItemIds.length === 0) {
      throw new ForbiddenException("You do not sell any item in this order");
    }

    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Invalid seller transition: ${order.status} -> ${status}`,
      );
    }

    const itemStatus =
      status === OrderStatus.DELIVERED ? OrderItemStatus.DELIVERED : OrderItemStatus.SHIPPED;

    await this.prisma.orderItem.updateMany({
      where: { id: { in: ownedItemIds } },
      data: { status: itemStatus },
    });

    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    });
  }
}
