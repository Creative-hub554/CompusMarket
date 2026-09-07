import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { AdsService } from "./ads.service";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type AuthedReq = { user: { userId: string; role: string } };

@Controller("/ads")
export class AdsController {
  constructor(private ads: AdsService) {}

  @Post("/campaigns")
  @UseGuards(AuthGuard("jwt"))
  async createCampaign(@Req() req: AuthedReq, @Body() body: any) {
    return this.ads.createCampaign(req.user.userId, body);
  }

  @Post("/banner-purchase")
  @UseGuards(AuthGuard("jwt"))
  async createBanner(@Req() req: AuthedReq, @Body() body: any) {
    return this.ads.createBannerPurchase(req.user.userId, body);
  }

  @Get("/banner/:slot")
  async getBanner(@Param("slot") slot: string) {
    const s = slot.toUpperCase() as "LEFT" | "RIGHT" | "BOTTOM";
    return this.ads.activeBannerForSlot(s);
  }

  @Post("/video-view")
  async recordVideoView(
    @Req() req: { user?: { userId: string } },
    @Body() body: { videoAdId: string; watchedSeconds: number },
  ) {
    return this.ads.recordVideoView(req.user?.userId ?? null, body.videoAdId, body.watchedSeconds);
  }

  @Post("/banner-event")
  async recordBannerEvent(
    @Body() body: { bannerAdId: string; type: "IMPRESSION" | "CLICK"; eventKey: string },
  ) {
    if (!body.bannerAdId || !body.eventKey || !["IMPRESSION", "CLICK"].includes(body.type)) {
      throw new BadRequestException("Valid bannerAdId, type, and eventKey are required");
    }

    return this.ads.recordBannerEvent(body.bannerAdId, body.type, body.eventKey);
  }

  @Get("/billing")
  @UseGuards(AuthGuard("jwt"))
  async billing(@Req() req: AuthedReq) {
    return this.ads.advertiserBilling(req.user.userId);
  }

  @Post("/refund")
  @UseGuards(AuthGuard("jwt"))
  async refund(
    @Req() req: AuthedReq,
    @Body() body: { type: "campaign" | "banner"; id: string },
  ) {
    if (!["campaign", "banner"].includes(body.type) || !body.id) {
      throw new BadRequestException("Valid payment type and id are required");
    }

    return this.ads.refundOwnedAd(req.user.userId, body.type, body.id);
  }

  @Get("/refund-requests")
  @UseGuards(AuthGuard("jwt"))
  async refundRequests(@Req() req: AuthedReq) {
    if (req.user.role !== "ADMIN") throw new ForbiddenException("Admin access required");
    return this.ads.listRefundRequests();
  }

  @Post("/refund-requests/:type/:id/approve")
  @UseGuards(AuthGuard("jwt"))
  async approveRefund(@Req() req: AuthedReq, @Param("type") type: string, @Param("id") id: string) {
    if (req.user.role !== "ADMIN") throw new ForbiddenException("Admin access required");
    if (type !== "campaign" && type !== "banner") throw new BadRequestException("Invalid ad type");
    return this.ads.approveRefund(type, id);
  }

  @Get("/slot-pricing")
  async getSlotPricing() {
    return this.ads.getAdSlotPricing();
  }

  @Get("/moderation")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async moderationQueue() {
    return this.ads.listModerationQueue();
  }

  @Post("/moderation/:type/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async moderate(
    @Param("type") type: string,
    @Param("id") id: string,
    @Body() body: { status: "APPROVED" | "REJECTED" | "PAUSED" },
  ) {
    if (type !== "banner" && type !== "video") {
      throw new BadRequestException("Invalid ad type");
    }
    if (!["APPROVED", "REJECTED", "PAUSED"].includes(body.status)) {
      throw new BadRequestException("Invalid moderation status");
    }
    return this.ads.moderateAd(type, id, body.status);
  }

  @Post("/webhook")
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature?: string,
  ) {
    if (!signature || !req.rawBody) {
      throw new BadRequestException("Stripe signature and raw request body are required");
    }
    const event = this.ads.constructStripeWebhookEvent(req.rawBody, signature);
    if (event.type === "payment_intent.succeeded") {
      await this.ads.handlePaymentIntentSucceeded((event.data.object as { id: string }).id);
    } else if (
      event.type === "payment_intent.payment_failed" ||
      event.type === "payment_intent.canceled"
    ) {
      await this.ads.handlePaymentIntentFailed((event.data.object as { id: string }).id);
    }
    return { received: true };
  }
}
