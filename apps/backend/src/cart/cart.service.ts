import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const MAX_QTY = 99;

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}
  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true } } },
      });
    }

    return cart;
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException("Product not found");
    if (product.status !== "ACTIVE") throw new BadRequestException("Product is not available");
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException("Quantity must be a positive number");
    }

    const cart = await this.getCart(userId);

    // Bound the line quantity: never exceed a sane max or the available stock.
    const existingLine = cart.items.find((i) => i.productId === productId);
    const target = (existingLine?.quantity ?? 0) + quantity;
    const cap = product.stock > 0 ? Math.min(product.stock, MAX_QTY) : MAX_QTY;
    const next = Math.min(target, cap);

    // Atomic upsert on the (cartId, productId) unique constraint prevents
    // duplicate lines / lost updates under concurrent add-to-cart requests.
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity: Math.min(quantity, cap) },
      update: { quantity: next },
    });
    return this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
      include: { product: true },
    });
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.getCart(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Item not found");

    if (quantity <= 0) {
      return this.removeItem(userId, itemId);
    }

    const qty = Math.min(quantity, MAX_QTY);
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: qty },
      include: { product: true },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getCart(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Item not found");

    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: string) {
    const cart = await this.getCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { success: true };
  }
}
