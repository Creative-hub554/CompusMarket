import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma, ArticleCategory } from "@theo/database";

@Injectable()
export class ArticlesService {
  async create(data: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    category: ArticleCategory;
    tags?: string[];
    authorId: string;
  }) {
    return prisma.article.create({ data });
  }

  async findAllPublished() {
    return prisma.article.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll() {
    return prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    });
  }

  async findBySlug(slug: string) {
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } },
    });
    if (!article) throw new NotFoundException("Article not found");
    return article;
  }

  async findByCategory(category: ArticleCategory) {
    return prisma.article.findMany({
      where: { published: true, category },
      orderBy: { createdAt: "desc" },
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
    await this.findBySlug(id);
    return prisma.article.update({ where: { id }, data });
  }
}
