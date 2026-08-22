"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

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

const CONDITIONS = ["A", "B", "C"];

function ProductResultCard({ hit }: { hit: SearchHit }) {
  const tp = useTranslations("product");
  const conditionLabels: Record<string, string> = {
    A: tp("conditionA"),
    B: tp("conditionB"),
    C: tp("conditionC"),
  };
  const images = hit.images || [];
  const conditionColors: Record<string, string> = {
    A: "bg-green-100 text-green-800",
    B: "bg-amber-100 text-amber-800",
    C: "bg-orange-100 text-orange-800",
  };

  return (
    <Link
      href={`/shop/${hit.id}`}
      className="card-hover group block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-indigo-300"
    >
      <div className="aspect-square w-full bg-slate-50 flex items-center justify-center overflow-hidden">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={hit.name}
            width={500}
            height={500}
            className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="text-slate-300 text-sm">No image</div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold truncate">{hit.name}</h3>
        <p className="text-xs text-slate-500">{hit.categoryName}</p>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              conditionColors[hit.condition] || "bg-slate-100"
            }`}
          >
            {conditionLabels[hit.condition] || hit.condition}
          </span>
        </div>
        <p className="text-lg font-bold text-slate-900">
          ${Number(hit.price).toLocaleString()}
        </p>
      </div>
    </Link>
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
        <p className="text-slate-500 mt-1">{t("subtitle")}</p>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-48"
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
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-40"
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
          <label className="text-xs text-slate-500 flex flex-col gap-1">
            {t("minPrice")}
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-28"
            />
          </label>
          <label className="text-xs text-slate-500 flex flex-col gap-1">
            {t("maxPrice")}
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-28"
            />
          </label>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 hover:underline pb-2"
            >
              {t("clearFilters")}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        {loading
          ? t("loading")
          : t("resultsCount", { count: total })}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white h-64 animate-pulse"
            />
          ))}
        </div>
      ) : hits.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-white">
          <p className="text-slate-500">{t("noResults")}</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 inline-block text-indigo-600 hover:underline"
            >
              {t("clearFilters")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {hits.map((hit) => (
            <ProductResultCard key={hit.id} hit={hit} />
          ))}
        </div>
      )}
    </div>
  );
}
