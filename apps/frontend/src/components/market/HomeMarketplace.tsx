"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ProductCard } from "@/components/ProductCard";

type BrowseItem = {
  id: string;
  name: string;
  price: number | string;
  condition: string;
  images: unknown;
  sellerId: string | null;
  category?: { name: string } | null;
};

type Category = { id: string; name: string; slug: string };

/**
 * Marketplace discovery block shown on the Home hub: a live search box,
 * category chips, and a grid of the latest products. Deep-links into /shop.
 */
export function HomeMarketplace() {
  const shopT = useTranslations("shop");
  const marketT = useTranslations("market");

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      params.set("limit", "12");

      setLoading(true);
      fetch(`/api/products/browse?${params.toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { items?: BrowseItem[]; total?: number }) => {
          setItems(data.items || []);
          setTotal(data.total || 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [q, category]);

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5"
      style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{shopT("title")}</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {shopT("productsCount", { count: total })}
          </p>
        </div>
        <Link
          href="/shop"
          className="text-sm font-semibold text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 transition-colors"
        >
          {marketT("seeAll")} →
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={marketT("searchPlaceholder")}
          className="input-field w-full sm:w-56"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory("")}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              !category ? "bg-gradient-to-br from-gold to-gold-light text-white" : "hover:bg-[var(--surface-2)]"
            }`}
            style={!category ? undefined : { color: "var(--text-body)" }}
          >
            {shopT("all")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.slug === category ? "" : cat.slug)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
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

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border h-40 animate-pulse"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {q || category ? marketT("noResults") : shopT("noProducts")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
      )}
    </section>
  );
}
