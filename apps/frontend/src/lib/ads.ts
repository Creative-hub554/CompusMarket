"use client";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(input, {
    ...init,
    headers,
  });

  const body = await res.text();
  const json = body ? JSON.parse(body) : null;
  if (!res.ok) {
    const message = json?.error || json?.message || "Request failed";
    throw new Error(message);
  }
  return json as T;
}

export type AdSlot = "LEFT" | "RIGHT" | "BOTTOM";
export type CampaignObjective = "VIDEO_VIEWS" | "ENGAGEMENT" | "BRAND_AWARENESS" | "TRAFFIC";

export async function createAdCampaign(input: {
  postId?: string;
  objective?: CampaignObjective;
  dailyBudget: number;
  lifetimeBudget?: number;
  currency?: string;
  startAt?: Date | string;
  endAt?: Date | string;
}) {
  return fetchJson(`/api/ads/campaigns`, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      startAt: input.startAt ? new Date(input.startAt).toISOString() : undefined,
      endAt: input.endAt ? new Date(input.endAt).toISOString() : undefined,
    }),
  });
}

export async function purchaseBannerAd(input: {
  slot: AdSlot;
  startAt?: Date | string;
  durationMinutes: number;
  totalPrice: number;
  currency?: string;
  // Ad content fields
  imageUrl?: string;
  videoUrl?: string;
  clickUrl?: string;
  altText?: string;
  title?: string;
  description?: string;
}) {
  return fetchJson(`/api/ads/banner-purchase`, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      startAt: input.startAt ? new Date(input.startAt).toISOString() : undefined,
    }),
  });
}

export async function getActiveBannerForSlot(slot: AdSlot) {
  return fetchJson(`/api/ads/banner/${slot}`);
}

export async function recordBannerAdEvent(input: {
  bannerAdId: string;
  type: "IMPRESSION" | "CLICK";
  eventKey: string;
}) {
  return fetchJson("/api/ads/banner-event", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadAdMedia(file: File, kind: "image" | "video") {
  const body = new FormData();
  body.append("file", file);
  return fetchJson<{ url: string; filename: string }>(`/api/upload/${kind}`, {
    method: "POST",
    headers: {},
    body,
  });
}

export async function recordVideoAdView(input: { videoAdId: string; watchedSeconds: number }) {
  return fetchJson(`/api/ads/video-view`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getAdSlotPricing() {
  return fetchJson(`/api/ads/slot-pricing`);
}

export async function getAdBilling() {
  return fetchJson<Array<Record<string, unknown>>>("/api/ads/billing");
}

export async function refundAdPayment(input: { type: "campaign" | "banner"; id: string }) {
  return fetchJson("/api/ads/refund", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
