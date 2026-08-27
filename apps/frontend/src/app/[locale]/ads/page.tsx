"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { getAdBilling, refundAdPayment } from "@/lib/ads";

type Campaign = {
  id: string;
  objective: string | null;
  dailyBudget: number;
  lifetimeBudget: number | null;
  currency: string;
  startAt: string;
  status: string;
  paymentStatus: string;
  moderationStatus: string;
};

type Banner = {
  id: string;
  slot: string;
  startAt: string;
  durationMinutes: number;
  totalPrice: number;
  currency: string;
  paymentStatus: string;
  moderationStatus: string;
  title: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  impressions: number;
  clicks: number;
};

type AdData = { campaigns: Campaign[]; banners: Banner[] };
type BillingItem = {
  type: "campaign" | "banner";
  id: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  refundStatus: string;
  refundedAt: string | null;
  createdAt: string;
  receiptUrl: string | null;
};

function Status({ children }: { children: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{children}</span>;
}

export default function AdvertiserAdsPage() {
  const [data, setData] = useState<AdData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [billing, setBilling] = useState<BillingItem[]>([]);

  const load = useCallback(() => {
    fetch("/api/ads/mine")
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "Please sign in to view your ads." : "Failed to load ads");
        return response.json() as Promise<AdData>;
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
    getAdBilling()
      .then((items) => setBilling(items as BillingItem[]))
      .catch(() => setBilling([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function update(type: "campaign" | "banner", id: string, status: "PAUSED" | "CANCELLED") {
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/ads/mine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update ad");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ad");
    } finally {
      setBusy("");
    }

    async function refund(item: BillingItem) {
      if (!window.confirm("Request a refund for this payment? The ad will be stopped.")) return;
      setBusy(item.id);
      setError("");
      try {
        await refundAdPayment({ type: item.type, id: item.id });
        setBilling((current) => current.map((entry) => entry.id === item.id ? { ...entry, refundStatus: "REFUNDED", refundedAt: new Date().toISOString() } : entry));
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refund failed");
      } finally {
        setBusy("");
      }
    }
  }

  if (error && !data) return <div className="mx-auto max-w-5xl p-6"><p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p></div>;
  if (!data) return <div className="mx-auto max-w-5xl p-6 text-sm text-slate-500">Loading your ads...</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">My advertising</h1>
          <p className="mt-1 text-sm text-slate-500">Manage campaigns, banner bookings, and payment status.</p>
        </div>
        <Link href="/market/ads" className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Buy banner</Link>
      </div>
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Boost campaigns ({data.campaigns.length})</h2>
        <div className="space-y-3">
          {data.campaigns.length === 0 ? <p className="text-sm text-slate-500">No campaigns yet.</p> : data.campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-lg border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{campaign.objective || "Campaign"}</p>
                  <p className="text-sm text-slate-500">Daily budget: {campaign.dailyBudget} {campaign.currency} · Payment: {campaign.paymentStatus}</p>
                </div>
                <Status>{campaign.status}</Status>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <span>Moderation: {campaign.moderationStatus}</span>
                <span>Started: {new Date(campaign.startAt).toLocaleString()}</span>
                {campaign.status === "ACTIVE" && <button onClick={() => update("campaign", campaign.id, "PAUSED")} disabled={busy === campaign.id} className="ml-auto text-amber-700 hover:underline">Pause</button>}
                {!["CANCELLED", "COMPLETED"].includes(campaign.status) && <button onClick={() => update("campaign", campaign.id, "CANCELLED")} disabled={busy === campaign.id} className="text-red-700 hover:underline">Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Banner bookings ({data.banners.length})</h2>
        <div className="space-y-3">
          {data.banners.length === 0 ? <p className="text-sm text-slate-500">No banner bookings yet.</p> : data.banners.map((banner) => (
            <div key={banner.id} className="flex gap-4 rounded-lg border bg-white p-4">
              {banner.imageUrl && <img src={banner.imageUrl} alt={banner.title || "Ad creative"} className="h-20 w-28 rounded object-cover" />}
              {banner.videoUrl && <video src={banner.videoUrl} className="h-20 w-28 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{banner.title || `${banner.slot} banner`}</p>
                  <Status>{banner.moderationStatus}</Status>
                </div>
                <p className="text-sm text-slate-500">{banner.totalPrice} {banner.currency} · {banner.durationMinutes} minutes · Payment: {banner.paymentStatus}</p>
                <p className="mt-1 text-xs text-slate-500">{banner.impressions} impressions · {banner.clicks} clicks</p>
                <p className="mt-1 text-xs text-slate-500">Starts: {new Date(banner.startAt).toLocaleString()}</p>
              </div>
              {banner.moderationStatus === "APPROVED" && <button onClick={() => update("banner", banner.id, "PAUSED")} disabled={busy === banner.id} className="self-end text-sm text-amber-700 hover:underline">Pause</button>}
            </div>
          ))}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">Billing history ({billing.length})</h2>
        <div className="space-y-3">
          {billing.length === 0 ? <p className="text-sm text-slate-500">No payments yet.</p> : billing.map((item) => (
            <div key={`${item.type}-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
              <div>
                <p className="font-semibold">{item.type === "banner" ? "Banner booking" : "Boost campaign"} · {item.amount} {item.currency}</p>
                <p className="text-sm text-slate-500">Payment: {item.paymentStatus} · Refund: {item.refundStatus} · {new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {item.receiptUrl ? <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Receipt</a> : <span className="text-slate-400">Receipt unavailable</span>}
                {item.paymentStatus === "SUCCEEDED" && item.refundStatus === "NOT_REFUNDED" && <button onClick={() => refund(item)} disabled={busy === item.id} className="text-red-700 hover:underline">Refund</button>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
