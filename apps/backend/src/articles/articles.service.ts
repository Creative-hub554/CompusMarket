import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ArticleCategory } from "@theo/database";

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}
  async create(data: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    category: ArticleCategory;
    tags?: string[];
    authorId: string;
  }) {
    return this.prisma.article.create({ data: { ...data, tags: data.tags ?? [] } });
  }

  async findAllPublished() {
    return this.prisma.article.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async findAll() {
    return this.prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
      take: 100,
    });
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } },
    });
    if (!article) throw new NotFoundException("Article not found");
    return article;
  }

  async findByCategory(category: ArticleCategory) {
    return this.prisma.article.findMany({
      where: { published: true, category },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      excerpt: string;
      category: ArticleCategory;
      tags: string[];
      published: boolean;
    }>
  ) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Article not found");
    return this.prisma.article.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Article not found");
    return this.prisma.article.delete({ where: { id } });
  }
}
