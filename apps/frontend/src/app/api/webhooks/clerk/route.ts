import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook, type WebhookEvent } from "@clerk/nextjs/webhooks";

import { isDuplicateDelivery, rememberDelivery } from "./dedupe";
import { handleWebhookEvent } from "./handler";

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET is not configured" },
      { status: 503 },
    );
  }

  // verifyWebhook throws on a bad/missing signature; the explicit
  // signingSecret keeps this repo's CLERK_WEBHOOK_SECRET env name.
  let evt: WebhookEvent;
  try {
    evt = await verifyWebhook(req, { signingSecret: WEBHOOK_SECRET });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // A successful delivery is remembered so a Svix retry is not re-applied.
  const svixId = req.headers.get("svix-id") ?? "";
  if (isDuplicateDelivery(svixId)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleWebhookEvent(evt);
  } catch (error) {
    // Clerk retries failed deliveries, so surface the error.
    console.error("clerk webhook handling failed", evt.type, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  rememberDelivery(svixId);
  return NextResponse.json({ received: true });
}
