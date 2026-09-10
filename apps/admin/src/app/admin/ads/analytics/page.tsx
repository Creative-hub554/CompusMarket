"use client";

import { useEffect, useState } from "react";

type Analytics = {
  bannersBySlot: { slot: string; count: number; bookedValue: number }[];
  bannerPayments: { status: string; count: number }[];
  campaigns: { status: string; count: number; dailyBudget: number; lifetimeBudget: number }[];
  videoViews: { total: number; billed: number; unbilled: number };
  recentVideoAds: { id: string; durationSeconds: number; cpv: number; currency: string; views: number }[];
};

const money = (value: number, currency = "USD") =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;

export default function AdAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/ads/analytics")
      .then(async (response) => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json() as Promise<Analytics>;
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading analytics...</p>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Advertising analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Delivery, payment, campaign, and video billing overview.</p>
        </div>
        <a href="/admin/ads" className="text-sm text-blue-600 hover:underline">Manage pricing</a>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Video views", data.videoViews.total],
          ["Billed views", data.videoViews.billed],
          ["Unbilled views", data.videoViews.unbilled],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">Banner bookings by slot</h2>
          <div className="space-y-3">
            {data.bannersBySlot.length === 0 ? <p className="text-sm text-slate-500">No banner bookings.</p> : data.bannersBySlot.map((entry) => (
              <div key={entry.slot} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span className="font-medium">{entry.slot}</span>
                <span>{entry.count} bookings · {money(entry.bookedValue)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">Banner payment status</h2>
          <div className="space-y-3">
            {data.bannerPayments.length === 0 ? <p className="text-sm text-slate-500">No banner payments.</p> : data.bannerPayments.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span>{entry.status}</span>
                <span className="font-semibold">{entry.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">Campaign status</h2>
          <div className="space-y-3">
            {data.campaigns.length === 0 ? <p className="text-sm text-slate-500">No campaigns.</p> : data.campaigns.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span>{entry.status}</span>
                <span>{entry.count} · daily {money(entry.dailyBudget)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">Recent video ads</h2>
          <div className="space-y-3">
            {data.recentVideoAds.length === 0 ? <p className="text-sm text-slate-500">No video ads.</p> : data.recentVideoAds.map((ad) => (
              <div key={ad.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span>{ad.durationSeconds}s · CPV {money(ad.cpv, ad.currency)}</span>
                <span>{ad.views} views</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
