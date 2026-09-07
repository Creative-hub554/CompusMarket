import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { CampaignObjective } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";
import { StripeService } from "./stripe.service";

export interface CreateCampaignDto {
  postId?: string;
  objective?: CampaignObjective;
  dailyBudget: string | number;
  lifetimeBudget?: string | number;
  currency?: string;
  startAt?: Date;
  endAt?: Date;
}

export interface CreateBannerDto {
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
  async createCampaign(userId: string, dto: CreateCampaignDto) {
    const dailyNumber = Number(dto.dailyBudget);
    if (!Number.isFinite(dailyNumber) || dailyNumber <= 0) {
      throw new BadRequestException("A positive daily budget is required");
    }
    const dailyStr = String(dailyNumber);
    const lifetimeStr = dto.lifetimeBudget ? String(Number(dto.lifetimeBudget)) : null;

    // Billing: charge full lifetime budget up front if provided; otherwise charge first day (dailyBudget) up front.
    const toChargeValue = lifetimeStr ?? dailyStr;
    const toChargeNumber = Number(toChargeValue);
    const currency = dto.currency ?? "USD";

    // Use StripeService to create a payment intent (simulated when no keys present)
    const amountMinor = this.amountToMinorUnits(currency, toChargeNumber);
    const pi = await this.stripe.createPaymentIntent(Math.max(1, amountMinor), currency.toLowerCase(), { type: "campaign", userId });
    const stripePaymentId = pi.id ?? `simulated:${Date.now()}`;

    const simulated = stripePaymentId.startsWith("pi_sim_");
    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        postId: dto.postId,
        objective: dto.objective,
        campaignType: "DAILY_BUDGET",
        dailyBudget: dailyStr,
        lifetimeBudget: lifetimeStr ?? undefined,
        currency,
        startAt: dto.startAt ?? new Date(),
        endAt: dto.endAt ?? undefined,
        status: simulated ? "ACTIVE" : "DRAFT",
        paymentStatus: simulated ? "SUCCEEDED" : "PENDING",
        moderationStatus: "PENDING",
        stripePaymentId: stripePaymentId as string,
      },
    });

    return { ...campaign, clientSecret: pi.client_secret ?? null };
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

  async createBannerPurchase(userId: string, dto: CreateBannerDto) {
    // Price is derived server-side from AdSlotPricing so callers cannot set
    // their own totalPrice. Falls back to the submitted amount only when no
    // pricing is configured yet (pre-seed/dev), so a spoofed price never wins
    // once pricing exists.
    const duration = Number(dto.durationMinutes);
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new BadRequestException("A positive duration in minutes is required");
    }
    const pricing = await this.prisma.adSlotPricing.findUnique({
      where: { slot: dto.slot },
    });
    const currency = dto.currency ?? pricing?.currency ?? "USD";
    const totalNumber = pricing
      ? Number(pricing.price) * Math.ceil(duration / Number(pricing.durationMinutes))
      : Number(dto.totalPrice);
    if (!Number.isFinite(totalNumber) || totalNumber <= 0) {
      throw new BadRequestException("A valid positive total price is required");
    }
    const amountMinor = this.amountToMinorUnits(currency, totalNumber);
    const pi = await this.stripe.createPaymentIntent(Math.max(1, amountMinor), currency.toLowerCase(), { type: "banner", userId });
    const stripePaymentId = pi.id ?? `simulated:${Date.now()}`;

    const simulated = stripePaymentId.startsWith("pi_sim_");
    const banner = await this.prisma.bannerAd.create({
      data: {
        userId,
        slot: dto.slot,
        startAt: dto.startAt ?? new Date(),
        durationMinutes: dto.durationMinutes,
        totalPrice: String(totalNumber),
        currency,
        stripePaymentId: stripePaymentId as string,
        paymentStatus: simulated ? "SUCCEEDED" : "PENDING",
        moderationStatus: "PENDING",
          // Ad content fields
          imageUrl: dto.imageUrl,
          videoUrl: dto.videoUrl,
          clickUrl: dto.clickUrl,
          altText: dto.altText,
          title: dto.title,
          description: dto.description,
        },
      });
      return { ...banner, clientSecret: pi.client_secret ?? null };
    }

  /** Return the currently active banner for a slot using 5-minute rotation among active banners. */
  async activeBannerForSlot(slot: "LEFT" | "RIGHT" | "BOTTOM") {
    const now = new Date();
    const active = await this.prisma.bannerAd.findMany({
      where: {
        slot,
        startAt: { lte: now },
        paymentStatus: "SUCCEEDED",
        moderationStatus: "APPROVED",
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
      const stripePaymentId = pi.id ?? `simulated_view_${Date.now()}`;
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

    async advertiserBilling(userId: string) {
      const [campaigns, banners] = await Promise.all([
        this.prisma.campaign.findMany({
          where: { userId, stripePaymentId: { not: null } },
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true, dailyBudget: true, lifetimeBudget: true, currency: true, stripePaymentId: true, paymentStatus: true, refundStatus: true, refundedAt: true },
        }),
        this.prisma.bannerAd.findMany({
          where: { userId, stripePaymentId: { not: null } },
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true, slot: true, totalPrice: true, currency: true, stripePaymentId: true, paymentStatus: true, refundStatus: true, refundedAt: true },
        }),
      ]);
      const payments = [
        ...await Promise.all(campaigns.map(async (item) => ({ type: "campaign" as const, ...item, amount: Number(item.lifetimeBudget ?? item.dailyBudget), receiptUrl: await this.stripe.paymentReceiptUrl(item.stripePaymentId!) }))),
        ...await Promise.all(banners.map(async (item) => ({ type: "banner" as const, ...item, amount: Number(item.totalPrice), receiptUrl: await this.stripe.paymentReceiptUrl(item.stripePaymentId!) }))),
      ];
      return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async refundOwnedAd(userId: string, type: "campaign" | "banner", id: string) {
      const windowHours = Number(process.env.AD_REFUND_WINDOW_HOURS ?? 24);
      if (type === "campaign") {
        const item = await this.prisma.campaign.findFirst({ where: { id, userId } });
        if (!item) throw new Error("Campaign not found");
        if (item.refundStatus !== "NOT_REFUNDED") throw new Error("Payment has already been refunded");
        if (item.paymentStatus !== "SUCCEEDED" || !item.stripePaymentId) throw new Error("Only successful payments can be refunded");
        if (Date.now() - item.createdAt.getTime() > windowHours * 60 * 60 * 1000) throw new Error("This payment is outside the refund window");
        return this.prisma.campaign.update({ where: { id }, data: { refundStatus: "REQUESTED", refundRequestedAt: new Date(), status: "CANCELLED" } });
      }

      const item = await this.prisma.bannerAd.findFirst({ where: { id, userId } });
      if (!item) throw new Error("Banner ad not found");
      if (item.refundStatus !== "NOT_REFUNDED") throw new Error("Payment has already been refunded");
      if (item.paymentStatus !== "SUCCEEDED" || !item.stripePaymentId) throw new Error("Only successful payments can be refunded");
      if (Date.now() - item.createdAt.getTime() > windowHours * 60 * 60 * 1000) throw new Error("This payment is outside the refund window");
      return this.prisma.bannerAd.update({ where: { id }, data: { refundStatus: "REQUESTED", refundRequestedAt: new Date(), moderationStatus: "PAUSED" } });
    }

    async listRefundRequests() {
      const [campaigns, banners] = await Promise.all([
        this.prisma.campaign.findMany({ where: { refundStatus: "REQUESTED" }, orderBy: { refundRequestedAt: "asc" }, include: { user: { select: { name: true, email: true } } } }),
        this.prisma.bannerAd.findMany({ where: { refundStatus: "REQUESTED" }, orderBy: { refundRequestedAt: "asc" }, include: { user: { select: { name: true, email: true } } } }),
      ]);
      return { campaigns, banners };
    }

    async approveRefund(type: "campaign" | "banner", id: string) {
      if (type === "campaign") {
        const item = await this.prisma.campaign.findUnique({ where: { id } });
        if (!item || item.refundStatus !== "REQUESTED" || !item.stripePaymentId) throw new Error("Refund request not found");
        await this.stripe.refundPaymentIntent(item.stripePaymentId);
        return this.prisma.campaign.update({ where: { id }, data: { refundStatus: "REFUNDED", refundedAt: new Date() } });
      }
      const item = await this.prisma.bannerAd.findUnique({ where: { id } });
      if (!item || item.refundStatus !== "REQUESTED" || !item.stripePaymentId) throw new Error("Refund request not found");
      await this.stripe.refundPaymentIntent(item.stripePaymentId);
      return this.prisma.bannerAd.update({ where: { id }, data: { refundStatus: "REFUNDED", refundedAt: new Date() } });
    }

    async recordBannerEvent(
      bannerAdId: string,
      type: "IMPRESSION" | "CLICK",
      eventKey: string,
    ) {
      const banner = await this.prisma.bannerAd.findFirst({
        where: { id: bannerAdId, paymentStatus: "SUCCEEDED", moderationStatus: "APPROVED" },
        select: { id: true },
      });
      if (!banner) throw new Error("Banner ad not found");

      await this.prisma.bannerAdEvent.upsert({
        where: { eventKey },
        update: {},
        create: { bannerAdId, type, eventKey },
      });
      return { recorded: true };
    }

    async handlePaymentIntentSucceeded(paymentIntentId: string) {
      const [campaigns, banners] = await Promise.all([
        this.prisma.campaign.updateMany({
          where: { stripePaymentId: paymentIntentId },
          data: { paymentStatus: "SUCCEEDED", status: "ACTIVE" },
        }),
        this.prisma.bannerAd.updateMany({
          where: { stripePaymentId: paymentIntentId },
          data: { paymentStatus: "SUCCEEDED" },
        }),
      ]);
      return { campaigns: campaigns.count, banners: banners.count };
    }

    async handlePaymentIntentFailed(paymentIntentId: string) {
      const [campaigns, banners] = await Promise.all([
        this.prisma.campaign.updateMany({
          where: { stripePaymentId: paymentIntentId },
          data: { paymentStatus: "FAILED", status: "CANCELLED" },
        }),
        this.prisma.bannerAd.updateMany({
          where: { stripePaymentId: paymentIntentId },
          data: { paymentStatus: "FAILED" },
        }),
      ]);
      return { campaigns: campaigns.count, banners: banners.count };
    }

    async listModerationQueue() {
      const [banners, videos] = await Promise.all([
        this.prisma.bannerAd.findMany({
          where: { moderationStatus: "PENDING" },
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
        this.prisma.videoAd.findMany({
          where: { moderationStatus: "PENDING" },
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
      ]);
      return { banners, videos };
    }

    async moderateAd(type: "banner" | "video", id: string, moderationStatus: "APPROVED" | "REJECTED" | "PAUSED") {
      if (type === "banner") {
        return this.prisma.bannerAd.update({
          where: { id },
          data: { moderationStatus },
        });
      }
      return this.prisma.videoAd.update({
        where: { id },
        data: { moderationStatus },
      });
    }

    constructStripeWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
      return this.stripe.constructWebhookEvent(payload, signature);
    }
  }
