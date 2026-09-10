"use client";

import { useCallback, useEffect, useState } from "react";

type Ad = {
  id: string;
  user: { name: string | null; email: string };
  moderationStatus: string;
  paymentStatus?: string;
  slot?: string;
  imageUrl?: string | null;
  videoUrl?: string;
  title?: string | null;
  description?: string | null;
  durationSeconds?: number;
  cpv?: number | string;
  currency?: string;
};

export default function AdModerationPage() {
  const [ads, setAds] = useState<{ banners: Ad[]; videos: Ad[] }>({ banners: [], videos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/ads/moderation")
      .then(async (response) => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json() as Promise<{ banners: Ad[]; videos: Ad[] }>;
      })
      .then(setAds)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function moderate(type: "banner" | "video", id: string, status: "APPROVED" | "REJECTED" | "PAUSED") {
    const response = await fetch("/api/admin/ads/moderation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, status }),
    });
    if (!response.ok) {
      setError("Failed to update ad moderation status");
      return;
    }
    load();
  }

  function card(ad: Ad, type: "banner" | "video") {
    return (
      <div key={ad.id} className="rounded-lg border bg-white p-4">
        {ad.imageUrl && <img src={ad.imageUrl} alt={ad.title || "Ad creative"} className="mb-3 h-32 w-full rounded object-cover" />}
        {ad.videoUrl && <video src={ad.videoUrl} controls className="mb-3 h-32 w-full rounded object-cover" />}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{ad.title || `${type === "banner" ? "Banner" : "Video"} ad`}</h2>
            <p className="text-xs text-slate-500">{ad.user.name || ad.user.email} · {ad.slot || `${ad.durationSeconds}s video`}</p>
            {ad.description && <p className="mt-2 text-sm text-slate-600">{ad.description}</p>}
          </div>
          <span className="rounded bg-amber-100 px-2 py-1 text-xs">{ad.moderationStatus}</span>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => moderate(type, ad.id, "APPROVED")} className="rounded bg-green-600 px-3 py-1.5 text-xs text-white">Approve</button>
          <button onClick={() => moderate(type, ad.id, "PAUSED")} className="rounded bg-amber-500 px-3 py-1.5 text-xs text-white">Pause</button>
          <button onClick={() => moderate(type, ad.id, "REJECTED")} className="rounded bg-red-600 px-3 py-1.5 text-xs text-white">Reject</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Ad moderation</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Review creatives before they appear in public rotation.</p>
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading queue...</p> : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Banner ads ({ads.banners.length})</h2>
            <div className="grid gap-4 lg:grid-cols-2">{ads.banners.length ? ads.banners.map((ad) => card(ad, "banner")) : <p className="text-sm text-slate-500">No pending banners.</p>}</div>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Video ads ({ads.videos.length})</h2>
            <div className="grid gap-4 lg:grid-cols-2">{ads.videos.length ? ads.videos.map((ad) => card(ad, "video")) : <p className="text-sm text-slate-500">No pending videos.</p>}</div>
          </section>
        </div>
      )}
    </div>
  );
}
