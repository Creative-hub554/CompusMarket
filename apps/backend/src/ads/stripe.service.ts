import Stripe from "stripe";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class StripeService {
  private logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  constructor() {
    const key = process.env.STRIPE_SECRET;
    if (key) this.stripe = new Stripe(key, { apiVersion: "2022-11-15" });
  }

  async createPaymentIntent(amountCents: number, currency = "usd", metadata?: Record<string, string>) {
    if (!this.stripe) {
      this.logger.log(`Stripe not configured; simulate payment intent for ${amountCents} ${currency}`);
      return { id: `pi_sim_${Date.now()}`, client_secret: `secret_sim_${Date.now()}`, status: "requires_payment_method" } as any;
    }
    const pi = await this.stripe.paymentIntents.create({ amount: amountCents, currency, metadata });
    return pi;
  }

  async capturePaymentIntent(id: string) {
    if (!this.stripe) return { id: `sim_capture_${Date.now()}` } as any;
    const pi = await this.stripe.paymentIntents.capture(id);
    return pi;
  }

  constructWebhookEvent(payload: Buffer, signature: string) {
    if (!this.stripe) throw new Error("Stripe is not configured");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
