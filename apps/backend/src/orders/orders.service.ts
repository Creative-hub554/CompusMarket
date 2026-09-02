import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { OrderStatus, OrderItemStatus, Prisma } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";

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
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new BadRequestException(`Insufficient stock for ${item.product.name || "product"}`);
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

      const warrantyRows: Prisma.WarrantyCreateManyInput[] = [];
      for (const item of cart.items) {
        const months = item.product.warrantyMonths;
        if (!months || months <= 0) continue;
        const orderItem = order.items.find((oi) => oi.productId === item.productId);
        if (!orderItem) continue;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);
        warrantyRows.push({
          orderItemId: orderItem.id,
          productId: item.productId,
          userId,
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

    return order;
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        items: { include: { product: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
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
    return this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.CANCELLED) {
        await this.restoreStockAndWarranties(tx, order.items);
      }
      return tx.order.update({
        where: { id },
        data: { status },
        include: { items: { include: { product: true } } },
      });
    });
  }

  /**
   * A buyer can cancel their own order while it is still cancellable
   * (PENDING or PROCESSING). Stock is released back to the inventory and
   * associated warranties are voided in the same transaction.
   */
  async cancelMine(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.userId !== userId) {
      throw new ForbiddenException("You can only cancel your own order");
    }
    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(OrderStatus.CANCELLED)) {
      throw new BadRequestException(
        `Order in state ${order.status} can no longer be cancelled`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await this.restoreStockAndWarranties(tx, order.items);
      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { items: { include: { product: true } } },
      });
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
      status === OrderStatus.DELIVERED
        ? OrderItemStatus.DELIVERED
        : status === OrderStatus.CANCELLED
          ? OrderItemStatus.CANCELLED
          : OrderItemStatus.SHIPPED;

    return this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.CANCELLED && ownedItemIds.length > 0) {
        await this.restoreStockAndWarranties(
          tx,
          order.items.filter((item) => ownedItemIds.includes(item.id)),
        );
      }
      await tx.orderItem.updateMany({
        where: { id: { in: ownedItemIds } },
        data: { status: itemStatus },
      });

      const orderStatus =
        status === OrderStatus.CANCELLED &&
        order.items.some((item) => !ownedItemIds.includes(item.id))
          ? order.status
          : status;

      return tx.order.update({
        where: { id },
        data: { status: orderStatus },
        include: { items: { include: { product: true } } },
      });
    });
  }

  /** Releases stock and voids warranties for the given order items. */
  private async restoreStockAndWarranties(
    tx: Prisma.TransactionClient,
    items: { productId: string; quantity: number; id: string }[],
  ) {
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) continue;
      await tx.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    const orderItemIds = items.map((item) => item.id);
    if (orderItemIds.length > 0) {
      await tx.warranty.deleteMany({ where: { orderItemId: { in: orderItemIds } } });
    }
  }
}
