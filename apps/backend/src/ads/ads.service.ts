import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StripeService } from "./stripe.service";

interface CreateCampaignDto {
  postId?: string;
  objective?: string;
  dailyBudget: string | number;
  lifetimeBudget?: string | number;
  currency?: string;
  startAt?: Date;
  endAt?: Date;
}

interface CreateBannerDto {
  slot: "LEFT" | "RIGHT" | "BOTTOM";
  startAt?: Date;
  durationMinutes: number;
  totalPrice: string | number;
  currency?: string;
  // Ad content fields
  imageUrl?: string;
  videoUrl?: string;
  clickUrl?: string;
  altText?: string;
  title?: string;
  description?: string;
}

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);
  constructor(private prisma: PrismaService, private stripe: StripeService) {}

  /** Create a daily-budget campaign. Charges are performed via Stripe when configured, otherwise simulated. */
  async createCampaign(userId: string, dto: {
    postId?: string;
    objective?: string;
    dailyBudget: string | number;
    lifetimeBudget?: string | number;
    currency?: string;
    startAt?: Date;
    endAt?: Date;
  }) {
    const dailyStr = String(dto.dailyBudget);
    const lifetimeStr = dto.lifetimeBudget ? String(dto.lifetimeBudget) : null;

    // Billing: charge full lifetime budget up front if provided; otherwise charge first day (dailyBudget) up front.
    const toChargeValue = lifetimeStr ?? dailyStr;
    const toChargeNumber = Number(toChargeValue);
    const currency = dto.currency ?? "USD";

    // Use StripeService to create a payment intent (simulated when no keys present)
    const amountMinor = this.amountToMinorUnits(currency, toChargeNumber);
    const pi = await this.stripe.createPaymentIntent(Math.max(1, amountMinor), currency.toLowerCase(), { type: "campaign", userId });
    const stripePaymentId = (pi as any).id ?? `simulated:${Date.now()}`;

    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        postId: dto.postId,
        objective: dto.objective as any,
        campaignType: "DAILY_BUDGET",
        dailyBudget: dailyStr,
        lifetimeBudget: lifetimeStr ?? undefined,
        currency,
        startAt: dto.startAt ?? new Date(),
        endAt: dto.endAt ?? undefined,
        status: "ACTIVE",
        stripePaymentId: stripePaymentId as string,
      },
    });

    return campaign;
  }

  private amountToMinorUnits(currency: string, amount: number) {
    const c = (currency || "USD").toUpperCase();
    if (c === "KHR") return Math.round(amount); // KHR has no decimal places
    // default to 2 decimal currencies
    return Math.round(amount * 100);
  }

  private async simulateCharge(amount: number, currency = "USD") {
    // Keep a log and return a fake charge id. Real Stripe integration to replace this.
    this.logger.log(`Simulated charge ${amount} ${currency}`);
    return `sim_${Date.now()}`;
  }

  async createBannerPurchase(userId: string, dto: { slot: "LEFT" | "RIGHT" | "BOTTOM"; startAt?: Date; durationMinutes: number; totalPrice: string | number; currency?: string; imageUrl?: string; videoUrl?: string; clickUrl?: string; altText?: string; title?: string; description?: string }) {
    const totalNumber = Number(dto.totalPrice);
    const currency = dto.currency ?? "USD";
    const amountMinor = this.amountToMinorUnits(currency, totalNumber);
    const pi = await this.stripe.createPaymentIntent(Math.max(1, amountMinor), currency.toLowerCase(), { type: "banner", userId });
    const stripePaymentId = (pi as any).id ?? `simulated:${Date.now()}`;

    const banner = await this.prisma.bannerAd.create({
      data: {
        userId,
        slot: dto.slot,
        startAt: dto.startAt ?? new Date(),
        durationMinutes: dto.durationMinutes,
        totalPrice: String(totalNumber),
        currency,
        stripePaymentId: stripePaymentId as string,
          // Ad content fields
          imageUrl: dto.imageUrl,
          videoUrl: dto.videoUrl,
          clickUrl: dto.clickUrl,
          altText: dto.altText,
          title: dto.title,
          description: dto.description,
        },
      });
      return banner;
    }

  /** Return the currently active banner for a slot using 5-minute rotation among active banners. */
  async activeBannerForSlot(slot: "LEFT" | "RIGHT" | "BOTTOM") {
    const now = new Date();
    const active = await this.prisma.bannerAd.findMany({
      where: {
        slot,
        startAt: { lte: now },
        AND: [{
          // startAt + durationMinutes > now
        }],
      },
      orderBy: { createdAt: "asc" },
    });

    // filter by not expired
    const filtered = active.filter((a) => {
      const end = new Date(a.startAt.getTime() + a.durationMinutes * 60 * 1000);
      return end > now;
    });
    if (filtered.length === 0) return null;

    // 5-minute rotation index from earliest start
    const earliest = filtered[0].startAt;
    const elapsedMs = now.getTime() - earliest.getTime();
    const slotIndex = Math.floor(elapsedMs / (5 * 60 * 1000)) % filtered.length;
    return filtered[slotIndex];
  }

  /** Record a video ad view and bill if it meets the objective rules (<=6s completion or >=50% for >6s). */
  async recordVideoView(userId: string | null, videoAdId: string, watchedSeconds: number) {
    const ad = await this.prisma.videoAd.findUnique({ where: { id: videoAdId } });
    if (!ad) throw new Error("VideoAd not found");

    const view = await this.prisma.videoAdView.create({
      data: {
        videoAdId,
        viewerId: userId ?? undefined,
        watchedSeconds,
        billed: false,
      },
    });

    // Billing rule: if durationSeconds <= 6 => count only on completion (watchedSeconds >= durationSeconds)
    // else count when watchedSeconds >= 50% of duration
    const duration = ad.durationSeconds;
    let bill = false;
    if (duration <= 6) {
      if (watchedSeconds >= duration) bill = true;
    } else {
      if (watchedSeconds >= Math.ceil(duration * 0.5)) bill = true;
    }

    if (bill) {
      // Charge CPV (use StripeService - stripe expects minor units)
      const cpv = Number(ad.cpv);
      const currency = ad.currency ?? "USD";
      const amountMinor = this.amountToMinorUnits(currency, cpv);
      const pi = await this.stripe.createPaymentIntent(Math.max(1, amountMinor), (currency || "USD").toLowerCase(), { type: "video_view", videoAdId: ad.id });
      const stripePaymentId = (pi as any).id ?? `simulated_view_${Date.now()}`;
      await this.prisma.videoAdView.update({ where: { id: view.id }, data: { billed: true, billedAt: new Date() } });

      // Log a lightweight charge record in Prisma via Campaign (optional) — omitted for now.
      return { billed: true, cpvCharged: cpv, stripePaymentId };
    }

    return { billed: false };
  }

    /** Get active pricing for all ad slots */
    async getAdSlotPricing() {
      return this.prisma.adSlotPricing.findMany({
        where: { isActive: true },
        orderBy: { slot: "asc" },
      });
    }
  }
