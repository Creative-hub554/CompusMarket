import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Category } from "@theo/database";

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}
  async create(name: string, slug: string): Promise<Category> {
    return this.prisma.category.create({ data: { name, slug } });
  }

  async findAll(): Promise<(Category & { _count: { products: number } })[]> {
    return this.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });
  }

  async remove(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }

  async seed(): Promise<(Category & { _count: { products: number } })[]> {
    const categories = [
      { name: "Gaming PCs", slug: "gaming-pcs" },
      { name: "Business Laptops", slug: "business-laptops" },
      { name: "Desktop Computers", slug: "desktop-computers" },
      { name: "Graphics Cards", slug: "graphics-cards" },
      { name: "CPUs", slug: "cpus" },
      { name: "RAM", slug: "ram" },
      { name: "SSDs", slug: "ssds" },
      { name: "HDDs", slug: "hdds" },
      { name: "Keyboards", slug: "keyboards" },
      { name: "Mice", slug: "mice" },
      { name: "Monitors", slug: "monitors" },
      { name: "Networking", slug: "networking" },
      { name: "Accessories", slug: "accessories" },
    ];

    for (const cat of categories) {
      await this.prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: cat,
      });
    }

    return this.findAll();
  }
}
