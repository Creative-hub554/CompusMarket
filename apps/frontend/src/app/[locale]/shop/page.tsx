"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ReelsStrip } from "@/components/market/ReelsStrip";
import { ProductCard } from "@/components/ProductCard";
import { getActiveBannerForSlot, recordBannerAdEvent } from "@/lib/ads";

type BrowseItem = {
  id: string;
  name: string;
  description: string;
  price: number | string;
  condition: string;
  images: unknown;
  sellerId: string | null;
  category?: { name: string } | null;
};

type BrowseResponse = {
  items: BrowseItem[];
  total: number;
  page: number;
  limit: number;
};

type Category = { id: string; name: string; slug: string };

const CONDITIONS = ["A", "B", "C"];
const PAGE_SIZE = 12;

type BannerAdRecord = {
  id: string;
  imageUrl?: string;
  videoUrl?: string;
  clickUrl?: string;
  altText?: string;
  title?: string;
  description?: string;
};

function WideAdBanner() {
  const [banner, setBanner] = useState<BannerAdRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActiveBannerForSlot("BOTTOM" as Parameters<typeof getActiveBannerForSlot>[0])
      .then((data) => {
        if (!cancelled) setBanner((data as BannerAdRecord | null) ?? null);
      })
      .catch(() => {
        if (!cancelled) setBanner(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!banner || typeof window === "undefined") return;
    const key = `ad-impression:${banner.id}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    void recordBannerAdEvent({
      bannerAdId: banner.id,
      type: "IMPRESSION",
      eventKey: `${banner.id}:${crypto.randomUUID()}`,
    }).catch(() => window.sessionStorage.removeItem(key));
  }, [banner]);

  if (!banner) return null;

  return (
    <div
      className="rounded-xl border p-2 cursor-pointer transition-all hover:shadow-lg"
      style={{
        background: "linear-gradient(135deg, rgba(217,181,63,0.12), rgba(255,255,255,0.04))",
        borderColor: "var(--border-subtle)",
      }}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (banner.clickUrl) {
          void recordBannerAdEvent({
            bannerAdId: banner.id,
            type: "CLICK",
            eventKey: `${banner.id}:click:${crypto.randomUUID()}`,
          }).catch(() => {});
          window.open(banner.clickUrl, "_blank", "noopener,noreferrer");
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (banner.clickUrl) window.open(banner.clickUrl, "_blank", "noopener,noreferrer");
        }
      }}
    >
      {banner.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={banner.imageUrl}
          alt={banner.altText || banner.title || "Sponsored"}
          className="w-full rounded-lg object-cover"
          style={{ maxHeight: "200px" }}
        />
      )}
      {banner.title && <div className="mt-2 text-sm font-semibold truncate">{banner.title}</div>}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopPageInner />
    </Suspense>
  );
}

function ShopPageInner() {
  const shopT = useTranslations("shop");
  const marketT = useTranslations("market");
  const searchParams = useSearchParams();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  // Honor deep links (e.g. global search "view all" / Enter) that carry
  // ?q= / ?category= — including navigations that happen while this page is
  // already mounted (router.push from the search bar).
  useEffect(() => {
    const qParam = searchParams.get("q");
    const categoryParam = searchParams.get("category");
    if (qParam !== null && qParam !== q) setQ(qParam);
    if (categoryParam !== null && categoryParam !== category) setCategory(categoryParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (condition) params.set("condition", condition);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      setLoading(true);
      fetch(`/api/products/browse?${params.toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: BrowseResponse) => {
          setItems(page > 1 ? (prev) => dedupe([...prev, ...data.items]) : data.items);
          setTotal(data.total || 0);
          setTotalPages(Math.max(Math.ceil((data.total || 0) / PAGE_SIZE), 1));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [q, category, condition, minPrice, maxPrice, page]);

  function dedupe(list: BrowseItem[]) {
    const seen = new Set<string>();
    return list.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  }

  function resetAndClear() {
    setQ("");
    setCategory("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  function pickFilter(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  const hasFilters = q || category || condition || minPrice || maxPrice;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">{shopT("title")}</h1>
        <p className="page-subtitle">{shopT("subtitle")}</p>
      </div>

      <ReelsStrip />

      <WideAdBanner />

      {/* Filter bar */}
      <div
        className="rounded-2xl p-4 mb-5 space-y-4 border"
        style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
      >
        <div className="space-y-3">
          <input
            type="search"
            value={q}
            onChange={(e) => pickFilter(setQ)(e.target.value)}
            placeholder={marketT("searchPlaceholder")}
            className="input-field w-full"
          />
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-48">
              <select
                value={condition}
                onChange={(e) => pickFilter(setCondition)(e.target.value)}
                className="input-field w-full"
              >
                <option value="">{marketT("allConditions")}</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <label
              className="flex flex-col gap-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {marketT("minPrice")}
              <div className="w-28">
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => pickFilter(setMinPrice)(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </label>
            <label
              className="flex flex-col gap-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {marketT("maxPrice")}
              <div className="w-28">
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => pickFilter(setMaxPrice)(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </label>
            {hasFilters && (
              <button
                onClick={resetAndClear}
                className="pb-2 text-sm font-medium text-gold-600 hover:text-gold-700 transition-colors dark:text-gold-400 dark:hover:text-gold-300"
              >
                {marketT("clearFilters")}
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => pickFilter(setCategory)("")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !category ? "bg-gradient-to-br from-gold to-gold-light text-white" : "hover:bg-[var(--surface-2)]"
            }`}
            style={!category ? undefined : { color: "var(--text-body)" }}
          >
            {shopT("all")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => pickFilter(setCategory)(cat.slug === category ? "" : cat.slug)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                category === cat.slug
                  ? "bg-gradient-to-br from-gold to-gold-light text-white"
                  : "hover:bg-[var(--surface-2)]"
              }`}
              style={category === cat.slug ? undefined : { color: "var(--text-body)" }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        {loading && page === 1 ? marketT("loading") : shopT("productsCount", { count: total })}
      </p>

      {loading && page === 1 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border h-64 animate-pulse"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>
            {hasFilters ? marketT("noResults") : shopT("noProducts")}
          </p>
          {hasFilters && (
            <button
              onClick={resetAndClear}
              className="mt-4 inline-block text-sm font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 transition-colors"
            >
              {marketT("clearFilters")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                condition={item.condition}
                images={(item.images as string[]) || []}
                categoryName={item.category?.name}
                sellerBadge={Boolean(item.sellerId)}
              />
            ))}
          </div>

          {page < totalPages && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-semibold text-gold-600 hover:bg-gold hover:text-slate-900 dark:text-gold-400 dark:hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                {loading ? marketT("loading") : shopT("loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
