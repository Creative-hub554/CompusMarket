import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AdsService } from "./ads.service";

@Controller("/ads")
export class AdsController {
  constructor(private ads: AdsService) {}

  @Post("/campaigns")
  async createCampaign(@Req() req: any, @Body() body: any) {
    // expect authenticated user (auth guard typically applied at module level)
    const userId = req.user?.id ?? body.userId;
    return this.ads.createCampaign(userId, body);
  }

  @Post("/banner-purchase")
  async createBanner(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id ?? body.userId;
    return this.ads.createBannerPurchase(userId, body);
  }

  @Get("/banner/:slot")
  async getBanner(@Param("slot") slot: string) {
    const s = slot.toUpperCase() as "LEFT" | "RIGHT" | "BOTTOM";
    return this.ads.activeBannerForSlot(s);
  }

  @Post("/video-view")
  async recordVideoView(@Req() req: any, @Body() body: { videoAdId: string; watchedSeconds: number }) {
    const userId = req.user?.id ?? null;
    return this.ads.recordVideoView(userId, body.videoAdId, body.watchedSeconds);
  }

    @Get("/slot-pricing")
    async getSlotPricing() {
      return this.ads.getAdSlotPricing();
    }
  }
