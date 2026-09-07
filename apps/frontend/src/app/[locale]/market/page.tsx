"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PromoVideoPopup } from "@/components/market/PromoVideoPopup";
import { ReelsStrip } from "@/components/market/ReelsStrip";
import { ProductCard } from "@/components/ProductCard";
import { getActiveBannerForSlot, getAdSlotPricing, recordBannerAdEvent, type AdSlot } from "@/lib/ads";

type SearchHit = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  condition: string;
  status: string;
  categoryId: string;
  categoryName: string;
  images: string[];
};

type SearchResponse = {
  hits: SearchHit[];
  total: number;
  query: string;
  source: string;
};

type Category = { id: string; name: string; slug: string };

type BannerAdRecord = {
  id: string;
  slot: AdSlot;
  startAt: string;
  durationMinutes: number;
  totalPrice: number | string;
  currency: string;
  // Ad content fields
  imageUrl?: string;
  videoUrl?: string;
  clickUrl?: string;
  altText?: string;
  title?: string;
  description?: string;
};

type AdSlotPricingRecord = {
  id: string;
  slot: AdSlot;
  price: number | string;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
};

const CONDITIONS = ["A", "B", "C"];

function MarketAdBanner({ slot, refreshInterval = 30000 }: { slot: AdSlot; refreshInterval?: number }) {
  const [banner, setBanner] = useState<BannerAdRecord | null>(null);

  const fetchBanner = useCallback(() => {
    let cancelled = false;
    getActiveBannerForSlot(slot)
      .then((data) => {
        if (!cancelled) setBanner((data as BannerAdRecord | null) ?? null);
      })
      .catch(() => {
        if (!cancelled) setBanner(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slot]);

  useEffect(() => {
    fetchBanner();

    // Set up auto-refresh interval
    const intervalId = setInterval(fetchBanner, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchBanner, refreshInterval]);

  useEffect(() => {
    if (!banner || typeof window === "undefined") return;
    const key = `ad-impression:${banner.id}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    void recordBannerAdEvent({
      bannerAdId: banner.id,
      type: "IMPRESSION",
      eventKey: `${banner.id}:${crypto.randomUUID()}`,
    }).catch(() => {
      window.sessionStorage.removeItem(key);
    });
  }, [banner]);

  // ... rest of the component

  if (!banner) {
    return (
      <div
        className="rounded-xl border border-dashed p-4 text-xs text-center"
        style={{ background: "var(--surface)", borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
      >
        Ad space available
      </div>
    );
  }

  const handleClick = () => {
    if (banner.clickUrl) {
      void recordBannerAdEvent({
        bannerAdId: banner.id,
        type: "CLICK",
        eventKey: `${banner.id}:click:${crypto.randomUUID()}`,
      }).catch(() => {});
      window.open(banner.clickUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isVideo = banner.videoUrl && banner.videoUrl.length > 0;
  const hasImage = banner.imageUrl && banner.imageUrl.length > 0;

  return (
    <div
      className="rounded-xl border p-2 cursor-pointer transition-all hover:shadow-lg"
      style={{
        background: "linear-gradient(135deg, rgba(217,181,63,0.12), rgba(255,255,255,0.04))",
        borderColor: "var(--border-subtle)"
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded">
            Sponsored
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            {banner.slot}
          </span>
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {String(banner.totalPrice)} {banner.currency}
        </span>
      </div>

      {/* Ad Content - Image or Video */}
      {isVideo ? (
        <video
          src={banner.videoUrl}
          aria-label={banner.altText || banner.title || 'Video advertisement'}
          className="w-full rounded-lg"
          controls
          playsInline
          muted
          style={{ maxHeight: slot === 'BOTTOM' ? '200px' : '300px' }}
        />
      ) : hasImage ? (
        <img
          src={banner.imageUrl}
          alt={banner.altText || banner.title || 'Image advertisement'}
          className="w-full rounded-lg object-cover"
          style={{ maxHeight: slot === 'BOTTOM' ? '200px' : '300px' }}
        />
      ) : (
        // Fallback to text-only if no media
        <div className="text-center py-4">
          <div className="text-sm font-semibold">{banner.title || 'Marketplace banner'}</div>
          <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {banner.description || `Runs until ${new Date(banner.startAt).toLocaleString()} · ${banner.durationMinutes} min`}
          </div>
        </div>
      )}

      {(banner.title || banner.description) && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          {banner.title && (
            <div className="text-sm font-semibold truncate">{banner.title}</div>
          )}
          {banner.description && (
            <div className="mt-1 text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {banner.description}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        <span>Ends: {new Date(new Date(banner.startAt).getTime() + banner.durationMinutes * 60 * 1000).toLocaleTimeString()}</span>
        <span>Duration: {banner.durationMinutes} min</span>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const t = useTranslations("market");

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Ad slot pricing
  const [slotPricing, setSlotPricing] = useState<AdSlotPricingRecord[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  // Fetch ad slot pricing
  useEffect(() => {
    getAdSlotPricing()
      .then((data) => {
        if (Array.isArray(data)) {
          setSlotPricing(data);
        }
      })
      .catch(() => {
        // Silently fail - pricing is optional enhancement
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (categoryId) params.set("categoryId", categoryId);
      if (condition) params.set("condition", condition);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);

      setLoading(true);
      fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: SearchResponse) => {
          setHits(data.hits || []);
          setTotal(data.total || 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [q, categoryId, condition, minPrice, maxPrice]);

  function clearFilters() {
    setQ("");
    setCategoryId("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
  }

  const hasFilters =
    q || categoryId || condition || minPrice || maxPrice;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>

        {/* Ad Slot Pricing Display */}
        {slotPricing.length > 0 && (
          <div className="mb-4 p-3 rounded-lg border bg-gold-500/5" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="font-medium text-gold-500">Ad Slot Pricing:</span>
              {slotPricing.map((pricing) => (
                <span key={pricing.slot} className="flex items-center gap-1 px-2 py-1 rounded bg-gold-500/10">
                  <span className="font-medium">{pricing.slot}</span>
                  <span>{String(pricing.price)} {pricing.currency}</span>
                  <span className="hidden sm:inline">/ {pricing.durationMinutes} min</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <ReelsStrip />

      <div className="mb-6">
        <MarketAdBanner slot="BOTTOM" />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-52 shrink-0">
          <MarketAdBanner slot="LEFT" />
        </aside>

        <div className="flex-1">
          {/* Filter bar */}
          <div
            className="rounded-xl p-4 mb-6 space-y-4 border"
            style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
          >
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="input-field flex-1"
              />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-field md:w-48"
              >
                <option value="">{t("allCategories")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="input-field md:w-40"
              >
                <option value="">{t("allConditions")}</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs flex flex-col gap-1" style={{ color: "var(--text-muted)" }}>
                {t("minPrice")}
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="input-field w-28"
                />
              </label>
              <label className="text-xs flex flex-col gap-1" style={{ color: "var(--text-muted)" }}>
                {t("maxPrice")}
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="input-field w-28"
                />
              </label>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 pb-2 transition-colors"
                >
                  {t("clearFilters")}
                </button>
              )}
            </div>
          </div>

          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            {loading
              ? t("loading")
              : t("resultsCount", { count: total })}
          </p>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border h-64 animate-pulse"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
                />
              ))}
            </div>
          ) : hits.length === 0 ? (
            <div
              className="text-center py-16 rounded-xl border"
              style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
            >
              <p style={{ color: "var(--text-muted)" }}>{t("noResults")}</p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 inline-block text-sm font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 transition-colors"
                >
                  {t("clearFilters")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {hits.map((hit) => (
                <ProductCard
                  key={hit.id}
                  id={hit.id}
                  name={hit.name}
                  price={hit.price}
                  condition={hit.condition}
                  images={hit.images || []}
                  categoryName={hit.categoryName}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="w-full lg:w-52 shrink-0">
          <MarketAdBanner slot="RIGHT" />
        </aside>
      </div>

      <PromoVideoPopup />
    </div>
  );
}
