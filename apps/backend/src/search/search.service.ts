import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Meilisearch: MeiliSearch } = require("meilisearch");

const INDEX_NAME = "products";

@Injectable()
export class SearchService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(SearchService.name);
  private client: any = null;

  onModuleInit() {
    const host = process.env.MEILI_HOST || "http://localhost:7700";
    const key = process.env.MEILI_API_KEY || "";

    try {
      this.client = new MeiliSearch({ host, apiKey: key });
      this.logger.log(`Meilisearch client initialized (${host})`);
    } catch (e) {
      this.logger.warn("Failed to initialize Meilisearch client. Search will be unavailable.");
    }
  }

  private isAvailable(): boolean {
    if (!this.client) return false;
    return true;
  }

  async ensureIndex() {
    if (!this.isAvailable()) return;
    try {
      const indexes = await this.client!.getIndexes();
      const exists = indexes.results.some((i: { uid: string }) => i.uid === INDEX_NAME);
      if (!exists) {
        await this.client!.createIndex(INDEX_NAME, { primaryKey: "id" });
        await this.client!.index(INDEX_NAME).updateFilterableAttributes([
          "categoryId",
          "condition",
          "status",
          "price",
        ]);
        await this.client!.index(INDEX_NAME).updateSearchableAttributes([
          "name",
          "description",
          "categoryName",
        ]);
        this.logger.log(`Index "${INDEX_NAME}" created`);
      }
    } catch (e) {
      this.logger.error("Failed to ensure index", e);
    }
  }

  async indexProduct(productId: string) {
    if (!this.isAvailable()) return;
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { category: true },
      });
      if (!product) return;

      await this.client!.index(INDEX_NAME).addDocuments([
        {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          condition: product.condition,
          status: product.status,
          categoryId: product.categoryId,
          categoryName: product.category.name,
          images: product.images,
          createdAt: product.createdAt.getTime(),
        },
      ]);
      this.logger.log(`Indexed product: ${product.name}`);
    } catch (e) {
      this.logger.error(`Failed to index product ${productId}`, e);
    }
  }

  async removeFromIndex(productId: string) {
    if (!this.isAvailable()) return;
    try {
      await this.client!.index(INDEX_NAME).deleteDocument(productId);
      this.logger.log(`Removed product ${productId} from index`);
    } catch (e) {
      this.logger.error(`Failed to remove product ${productId} from index`, e);
    }
  }

  async reindexAll() {
    if (!this.isAvailable()) return;
    try {
      await this.ensureIndex();
      const products = await this.prisma.product.findMany({
        include: { category: true },
      });
      const docs = products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        condition: p.condition,
        status: p.status,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        images: p.images,
        createdAt: p.createdAt.getTime(),
      }));
      await this.client!.index(INDEX_NAME).addDocuments(docs);
      this.logger.log(`Reindexed ${docs.length} products`);
    } catch (e) {
      this.logger.error("Failed to reindex all products", e);
    }
  }

  async search(query: string, filters?: { categoryId?: string; minPrice?: number; maxPrice?: number }) {
    if (!this.isAvailable()) {
      return this.fallbackSearch(query, filters);
    }

    try {
      const filterParts: string[] = [];
      if (filters?.categoryId) filterParts.push(`categoryId = ${filters.categoryId}`);
      if (filters?.minPrice !== undefined) filterParts.push(`price >= ${filters.minPrice}`);
      if (filters?.maxPrice !== undefined) filterParts.push(`price <= ${filters.maxPrice}`);

      const result = await this.client!.index(INDEX_NAME).search(query, {
        limit: 20,
        filter: filterParts.length > 0 ? filterParts : undefined,
      });

      return {
        hits: result.hits,
        total: result.estimatedTotalHits || result.hits.length,
        query,
        source: "meilisearch",
      };
    } catch (e) {
      this.logger.error("Meilisearch search failed, falling back to Prisma", e);
      return this.fallbackSearch(query, filters);
    }
  }

  private async fallbackSearch(
    query: string,
    filters?: { categoryId?: string; minPrice?: number; maxPrice?: number },
  ) {
    const where: any = {
      status: "ACTIVE",
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
      ],
    };

    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters?.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters?.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      hits: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        condition: p.condition,
        status: p.status,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        images: p.images,
      })),
      total: products.length,
      query,
      source: "prisma",
    };
  }
}