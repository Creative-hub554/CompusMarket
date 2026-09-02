import { Controller, Get, Post, Body, Req, UseGuards, ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { AiService, AssistantProduct, SellerInsightsPayload } from "./ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { RateLimitGuard } from "../common/rate-limit.guard";
import { DescribeProductDto } from "./dto/describe-product.dto";
import { ImproveSummaryDto } from "./dto/improve-summary.dto";
import { ImproveExperienceDto } from "./dto/improve-experience.dto";
import { CoverLetterDto } from "./dto/cover-letter.dto";
import { CreateAssistantProductDto } from "./dto/create-assistant-product.dto";
import { CreateAssistantCareerDto } from "./dto/create-assistant-career.dto";
import { CreateAssistantChatDto } from "./dto/create-assistant-chat.dto";
import { SellerInsightsDto } from "./dto/seller-insights.dto";

@Controller("ai")
@UseGuards(new RateLimitGuard(20, 60))
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("status")
  status() {
    return this.aiService.status();
  }

  @Post("assistant/chat")
  async assistantChat(@Body() body: CreateAssistantChatDto) {
    const { message, lang = "en", hasResume, page } = body;
    const spec = await this.aiService.extractSearchSpec(message, lang);
    let products: AssistantProduct[] = [];
    if (spec && typeof spec.query === "string" && spec.query) {
      products = await this.aiService.findProducts(spec);
    }
    const { reply, links } = await this.aiService.generateGuideResponse(
      message,
      lang,
      products,
      page,
      hasResume,
    );
    return {
      reply,
      ...(products.length > 0 ? { products } : {}),
      ...(links.length > 0 ? { links } : {}),
    };
  }

  @Post("assistant/products")
  async assistantProducts(@Body() body: CreateAssistantProductDto) {
    const { message, lang = "en" } = body;
    const spec = await this.aiService.extractSearchSpec(message, lang);
    let products: AssistantProduct[] = [];
    if (spec && typeof spec.query === "string" && spec.query) {
      products = await this.aiService.findProducts(spec);
    }
    const reply = await this.aiService.generateAssistantResponse(message, lang, products);
    return products.length > 0 ? { reply, products } : { reply };
  }

  @Post("assistant/careers")
  async assistantCareers(@Body() body: CreateAssistantCareerDto) {
    const { message, lang = "en" } = body;
    return this.aiService.extractCareerMatch(message, lang);
  }

  @Post("describe-product")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  describeProduct(@Body() body: DescribeProductDto) {
    return this.aiService.generateProductDescription(body.name, body.category, body.condition, body.keywords);
  }

  @Post("resume/improve-summary")
  @UseGuards(AuthGuard("jwt"))
  improveSummary(@Body() body: ImproveSummaryDto) {
    return this.aiService.improveResumeSummary(body.summary, body.targetRole);
  }

  @Post("resume/improve-experience")
  @UseGuards(AuthGuard("jwt"))
  improveExperience(@Body() body: ImproveExperienceDto) {
    return this.aiService.improveExperienceDescription(body.description, body.position, body.company);
  }

  @Post("resume/cover-letter")
  @UseGuards(AuthGuard("jwt"))
  coverLetter(@Body() body: CoverLetterDto) {
    return this.aiService.generateCoverLetter(body.fullName, body.targetRole, body.company, body.skills, body.experience);
  }

  /**
   * Sales / stock intelligence for the authenticated seller, computed
   * server-side from their OWN data only. Requires an approved seller profile.
   */
  @Post("seller-insights")
  @UseGuards(AuthGuard("jwt"))
  async sellerInsights(@Req() req: { user: { userId: string } }, @Body() body: SellerInsightsDto) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, verificationStatus: true },
    });
    if (!profile || profile.verificationStatus !== "APPROVED") {
      throw new ForbiddenException("An approved seller profile is required");
    }

    const [products, items] = await Promise.all([
      this.prisma.product.findMany({
        where: { sellerId: profile.id },
        select: { id: true, name: true, stock: true, status: true },
      }),
      this.prisma.orderItem.findMany({
        where: { product: { sellerId: profile.id } },
        select: {
          orderId: true,
          productId: true,
          quantity: true,
          price: true,
          order: { select: { status: true } },
        },
      }),
    ]);

    const productCount = products.length;
    const activeCount = products.filter((p) => p.status === "ACTIVE").length;
    const lowStockCount = products.filter((p) => p.stock < 3).length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

    const soldLines = items.filter((i) => i.order.status !== "CANCELLED");
    const revenue = soldLines.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const orderIds = new Set(soldLines.map((i) => i.orderId));
    const orderCount = orderIds.size;

    const statusBreakdown: Record<string, number> = {};
    for (const orderId of orderIds) {
      const status = soldLines.find((i) => i.orderId === orderId)?.order.status;
      if (status) statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1;
    }

    const byProduct = new Map<string, { name: string; sold: number }>();
    for (const i of soldLines) {
      const entry = byProduct.get(i.productId) ?? { name: "", sold: 0 };
      const product = products.find((p) => p.id === i.productId);
      entry.name = product?.name ?? entry.name;
      entry.sold += i.quantity;
      byProduct.set(i.productId, entry);
    }
    let topProduct: { name: string; sold: number } | null = null;
    for (const entry of byProduct.values()) {
      if (!topProduct || entry.sold > topProduct.sold) topProduct = entry;
    }

    const insights: SellerInsightsPayload = {
      productCount,
      activeCount,
      lowStockCount,
      totalStock,
      orderCount,
      revenue,
      avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
      statusBreakdown,
      topProduct,
    };

    const text = await this.aiService.generateSellerInsights(insights, body.lang ?? "en");
    if (!text) {
      throw new ServiceUnavailableException("AI insights are unavailable right now.");
    }
    return { insights, text };
  }
}
