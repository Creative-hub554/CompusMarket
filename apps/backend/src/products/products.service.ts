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
type ProductWithRelations = Product & {
  category: Category;
  reviews: Review[];
  ratingAvg?: number;
  ratingCount?: number;
};

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

  async findAll(inStock?: boolean, ids?: string[]): Promise<ProductWithCategory[]> {
    return this.prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(inStock ? { stock: { gt: 0 } } : {}),
        ...(ids && ids.length > 0 ? { id: { in: ids.slice(0, 24) } } : {}),
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  /**
   * Paginated shop browsing. Unlike findAll (legacy, unbounded), this caps
   * the page size and returns the total count so clients can paginate
   * without fetching every product.
   */
  async browse(opts: {
    category?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ProductWithCategory[]; total: number; page: number; limit: number }> {
    const limit = Number.isFinite(opts.limit) ? Math.min(Math.max(opts.limit as number, 1), 48) : 12;
    const page = Number.isFinite(opts.page) ? Math.max(opts.page as number, 1) : 1;
    const q = typeof opts.q === "string" ? opts.q.trim() : undefined;
    const where = {
      status: "ACTIVE" as const,
      ...(opts.category ? { category: { slug: opts.category } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findAllAdmin(): Promise<ProductWithCategory[]> {
    return this.prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Same-category products, excluding the current one, for "you may also like". */
  async findRelated(productId: string, limit = 4) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });
    if (!product) return [];
    return this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        status: "ACTIVE",
        id: { not: productId },
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async findPromos() {    return this.prisma.product.findMany({
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
    const [product, summary] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id, status: "ACTIVE" },
        include: {
          category: true,
          reviews: {
            take: 20,
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      this.prisma.review.aggregate({
        where: { productId: id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);
    if (!product) throw new NotFoundException("Product not found");
    return {
      ...product,
      ratingAvg: summary._avg.rating ?? 0,
      ratingCount: summary._count.rating,
    };
  }

  async findOneAdmin(id: string): Promise<ProductWithRelations> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: { orderBy: { createdAt: "desc" }, take: 50 },
      },
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
      orderBy: { createdAt: "desc" },
      take: 60,
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
      where: { productId, order: { userId }, feedback: { is: null } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, createdAt: true },
    });
    return items.map((item) => ({ orderItemId: item.id, createdAt: item.createdAt }));
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
