import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@theo/database";
import type { Product, Category, Review } from "@theo/database";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import * as qrcode from "qrcode";

type ProductWithCategory = Product & { category: Category };
type ProductWithRelations = Product & { category: Category; reviews: Review[] };

@Injectable()
export class ProductsService {
  async create(dto: CreateProductDto): Promise<Product> {
    const product = await prisma.product.create({ data: dto });
    return this.generateQr(product.id);
  }

  async findAll(): Promise<ProductWithCategory[]> {
    return prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string): Promise<ProductWithRelations> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, reviews: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);
    return prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<Product> {
    await this.findOne(id);
    return prisma.product.delete({ where: { id } });
  }

  async findByCategory(slug: string): Promise<ProductWithCategory[]> {
    return prisma.product.findMany({
      where: { category: { slug } },
      include: { category: true },
    });
  }

  private async generateQr(productId: string): Promise<Product> {
    const qrDataUrl = await qrcode.toDataURL(`product:${productId}`);
    return prisma.product.update({
      where: { id: productId },
      data: { qrCode: qrDataUrl },
    });
  }
}
