import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Product, Category, Review } from "@theo/database";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateReviewDto } from "./dto/create-review.dto";
import * as qrcode from "qrcode";
import { SearchService } from "../search/search.service";

type ProductWithCategory = Product & { category: Category };
type ProductWithRelations = Product & { category: Category; reviews: Review[] };

@Injectable()
export class ProductsService {
  constructor(private readonly searchService: SearchService, private prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const product = await this.prisma.product.create({
      data: { ...dto, images: dto.images ?? [] },
    });
    await this.searchService.indexProduct(product.id);
    return this.generateQr(product.id);
  }

  async findAll(inStock?: boolean): Promise<ProductWithCategory[]> {
    return this.prisma.product.findMany({
      where: { status: "ACTIVE", ...(inStock ? { stock: { gt: 0 } } : {}) },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllAdmin(): Promise<ProductWithCategory[]> {
    return this.prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findPromos() {
    return this.prisma.product.findMany({
      where: {
        status: "ACTIVE",
        stock: { gt: 0 },
        videoActive: true,
        videoUrl: { not: null },
      },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        videoUrl: true,
        condition: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
  }

  async findOne(id: string): Promise<ProductWithRelations> {
    const product = await this.prisma.product.findUnique({
      where: { id, status: "ACTIVE" },
      include: {
        category: true,
        reviews: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async findOneAdmin(id: string): Promise<ProductWithRelations> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, reviews: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);
    const product = await this.prisma.product.update({ where: { id }, data: dto });
    await this.searchService.indexProduct(id);
    return product;
  }

  async remove(id: string): Promise<Product> {
    await this.findOneAdmin(id);
    const product = await this.prisma.product.delete({ where: { id } });
    await this.searchService.removeFromIndex(id);
    return product;
  }

  async findByCategory(slug: string, inStock?: boolean): Promise<ProductWithCategory[]> {
    return this.prisma.product.findMany({
      where: {
        category: { slug },
        status: "ACTIVE",
        ...(inStock ? { stock: { gt: 0 } } : {}),
      },
      include: { category: true },
    });
  }

  private async generateQr(productId: string): Promise<Product> {
    const qrDataUrl = await qrcode.toDataURL(`product:${productId}`);
    return this.prisma.product.update({
      where: { id: productId },
      data: { qrCode: qrDataUrl },
    });
  }

  async getReviewable(
    productId: string,
    userId: string
  ): Promise<{ orderItemId: string; createdAt: Date }[]> {
    const items = await this.prisma.orderItem.findMany({
      where: { productId, order: { userId } },
      orderBy: { createdAt: "desc" },
      include: { feedback: true },
    });
    return items
      .filter((item) => !item.feedback)
      .map((item) => ({ orderItemId: item.id, createdAt: item.createdAt }));
  }

  async createReview(
    productId: string,
    userId: string,
    dto: CreateReviewDto
  ): Promise<Review> {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException("Rating must be between 1 and 5");
    }

    const item = await this.prisma.orderItem.findFirst({
      where: { id: dto.orderItemId, productId, order: { userId } },
      include: { feedback: true },
    });
    if (!item) {
      throw new NotFoundException(
        "Order item not found for this product and user"
      );
    }
    if (item.feedback) {
      throw new ConflictException("You have already reviewed this purchase");
    }

    return this.prisma.review.create({
      data: {
        productId,
        userId,
        orderItemId: dto.orderItemId,
        rating: dto.rating,
        comment: dto.comment,
        images: dto.images ?? [],
      },
      include: { user: { select: { name: true } } },
    });
  }
}
