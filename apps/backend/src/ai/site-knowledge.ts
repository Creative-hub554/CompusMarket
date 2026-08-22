import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const CACHE_TTL_MS = 5 * 60 * 1000;

export const SITE_SECTIONS = `Khmer Online Shop site map (paths users can visit):
- /shop — browse all products; /shop/[id] — product detail with condition grade, warranty info and seller link
- /market — public directory of all approved seller shops
- /feed — community feed: post updates, photos and videos, react, comment, follow people; stories disappear after 24h
- /profile/[userId] — a user's public profile (posts, followers); /profile/edit — edit your avatar, cover photo, bio and @username
- /cart — shopping cart; /orders — order history and tracking; /warranties — warranty claims and coverage
- /community — hub of free tools:
  - /community/careers — career guidance articles
  - /community/resume — online resume builder
  - /community/flashcards — study flashcards
  - /community/quizzes — quiz practice tool
  - /community/diagrams — diagram drawing tool
  - /community/documents — document editor/manager
  - /community/notes — note taking
  - /community/design — design tool
  - /community/image-processor — image processing tool
- /seller/apply — apply to become a seller (approval required); /seller/dashboard — seller management; /seller/shop/[userId] — a seller's public shop
- /support — customer support tickets; /messages — unified inbox: chat with any member, share photos and videos, see typing and online status
- /terms/buyer and /terms/seller — platform terms`;

@Injectable()
export class SiteKnowledgeService {
  private readonly logger = new Logger(SiteKnowledgeService.name);
  private cache: { text: string; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async build(): Promise<string> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.text;
    }

    let dynamic = "";
    try {
      const [categories, productAgg, articles, sellerCount] = await Promise.all([
        this.prisma.category.findMany({
          select: { name: true, _count: { select: { products: true } } },
          orderBy: { name: "asc" },
        }),
        this.prisma.product.aggregate({
          where: { status: "ACTIVE" },
          _count: true,
          _min: { price: true },
          _max: { price: true },
        }),
        this.prisma.article.findMany({
          where: { published: true },
          select: { title: true, slug: true, category: true },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
        this.prisma.sellerProfile.count({
          where: { verificationStatus: "APPROVED" },
        }),
      ]);

      const categoryLine =
        categories.length > 0
          ? `Categories: ${categories.map((c) => `${c.name} (${c._count.products})`).join(", ")}.`
          : "No categories defined yet.";
      const priceLine =
        productAgg._count > 0
          ? `Active listings: ${productAgg._count}, prices $${productAgg._min.price ?? 0}-$${productAgg._max.price ?? 0}.`
          : "There are currently no active listings.";
      const articleLine =
        articles.length > 0
          ? `Latest career articles: ${articles
              .map((a) => `"${a.title}" (/community/careers)`)
              .join(", ")}.`
          : "";
      const sellerLine = `${sellerCount} approved seller shop(s) on the marketplace.`;

      dynamic = [categoryLine, priceLine, sellerLine, articleLine]
        .filter(Boolean)
        .join("\n");
    } catch (e) {
      this.logger.warn("Failed to build dynamic site knowledge", e as Error);
    }

    const text = `${SITE_SECTIONS}\n\nCurrent store facts:\n${dynamic}`;
    this.cache = { text, at: Date.now() };
    return text;
  }
}
