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

  async createPaymentIntent(amountCents: number, currency = "usd", metadata?: Record<string, string>): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      this.logger.log(`Stripe not configured; simulate payment intent for ${amountCents} ${currency}`);
      return {
        id: `pi_sim_${Date.now()}`,
        object: "payment_intent",
        amount: amountCents,
        created: Math.floor(Date.now() / 1000),
        currency,
        livemode: false,
        metadata: metadata ?? {},
        status: "requires_payment_method",
        client_secret: `secret_sim_${Date.now()}`,
        payment_method_types: ["card"],
      } as unknown as Stripe.PaymentIntent;
    }
    const pi = await this.stripe.paymentIntents.create({ amount: amountCents, currency, metadata });
    return pi;
  }

  async capturePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      return {
        id: `sim_capture_${Date.now()}`,
        object: "payment_intent",
        amount: 0,
        created: Math.floor(Date.now() / 1000),
        currency: "usd",
        livemode: false,
        metadata: {},
        status: "succeeded",
        payment_method_types: [],
      } as unknown as Stripe.PaymentIntent;
    }
    const pi = await this.stripe.paymentIntents.capture(id);
    return pi;
  }

  async refundPaymentIntent(id: string) {
    if (!this.stripe) return { id: `re_sim_${Date.now()}`, status: "succeeded" };
    return this.stripe.refunds.create({ payment_intent: id });
  }

  async paymentReceiptUrl(id: string) {
    if (!this.stripe || id.startsWith("pi_sim_")) return null;
    const intent = await this.stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] });
    const charge = intent.latest_charge;
    if (!charge || typeof charge === "string") return null;
    return charge.receipt_url;
  }

  constructWebhookEvent(payload: Buffer, signature: string) {
    if (!this.stripe) throw new Error("Stripe is not configured");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
