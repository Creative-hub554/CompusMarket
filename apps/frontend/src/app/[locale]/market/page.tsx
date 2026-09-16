"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { apiFetch } from "@/lib/apiFetch";

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
type SearchResponse = { hits: SearchHit[]; total: number };
type Category = { id: string; name: string; slug: string };
type MarketFilters = {
  q: string;
  categoryId: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
};
type FilterKey = keyof MarketFilters;

type Translator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const CONDITIONS = ["A", "B", "C"];
const EMPTY_FILTERS: MarketFilters = {
  q: "",
  categoryId: "",
  condition: "",
  minPrice: "",
  maxPrice: "",
};

function filtersFromParams(params: URLSearchParams): MarketFilters {
  return {
    q: params.get("q") || "",
    categoryId: params.get("categoryId") || "",
    condition: params.get("condition") || "",
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
  };
}

function queryFromFilters(filters: MarketFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

export default function MarketPage() {
  const t = useTranslations("market");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<MarketFilters>(() =>
    filtersFromParams(searchParams),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const filterQuery = useMemo(() => queryFromFilters(filters), [filters]);
  const hasFilters = Object.values(filters).some(Boolean);
  const returnTo = `/${locale}${pathname}${filterQuery ? `?${filterQuery}` : ""}`;

  useEffect(() => {
    apiFetch<Category[]>("/api/categories")
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${filterQuery ? `?${filterQuery}` : ""}`,
    );
    const controller = new AbortController();
    const handle = setTimeout(() => {
      setLoading(true);
      apiFetch<SearchResponse>(`/api/search?${filterQuery}`, {
        signal: controller.signal,
      })
        .then((data) => {
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
  }, [filterQuery]);

  function updateFilter(key: FilterKey, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const categoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name || id;
  const chips = (Object.keys(filters) as FilterKey[])
    .filter((key) => filters[key])
    .map((key) => ({
      key,
      label: chipLabel(key, filters[key], categoryName, t),
      clear: () => updateFilter(key, ""),
    }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("subtitle")}</p>
        </div>
        <Link
          href={`/seller/products/new?returnTo=${encodeURIComponent(returnTo)}`}
          className="btn-primary inline-flex min-h-11 items-center px-5"
        >
          {t("sell")}
        </Link>
      </header>

      <section
        aria-label={t("filters")}
        className="mb-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
      >
        <div className="md:hidden">
          <details>
            <summary className="cursor-pointer list-none text-sm font-semibold">
              {t("filterAction")}
            </summary>
            <div className="mt-4">
              <FilterControls
                filters={filters}
                onChange={updateFilter}
                idSuffix="-mobile"
                categories={categories}
                t={t}
              />
            </div>
          </details>
        </div>
        <div className="hidden md:block">
          <FilterControls
            filters={filters}
            onChange={updateFilter}
            idSuffix="-desktop"
            categories={categories}
            t={t}
          />
        </div>
      </section>

      {chips.length > 0 && (
        <div
          className="mb-5 flex flex-wrap items-center gap-2"
          aria-label={t("activeFilters")}
        >
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 text-xs text-[var(--text-body)]"
              aria-label={`${t("removeFilter")}: ${chip.label}`}
            >
              {chip.label}
              <X size={14} aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-8 px-2 text-xs font-medium text-[var(--color-accent)]"
          >
            {t("clearFilters")}
          </button>
        </div>
      )}

      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {loading ? t("loading") : t("resultsCount", { count: total })}
      </p>
      {loading ? (
        <div
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
          aria-busy="true"
          aria-label={t("loading")}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)]"
            />
          ))}
        </div>
      ) : hits.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] py-16 text-center">
          <p className="text-[var(--text-muted)]">{t("noResults")}</p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-[var(--color-accent)]"
            >
              {t("clearFilters")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {hits.map((hit) => (
            <ProductCard key={hit.id} {...hit} sellerBadge />
          ))}
        </div>
      )}
    </div>
  );
}

function chipLabel(
  key: FilterKey,
  value: string,
  categoryName: (id: string) => string,
  t: Translator,
) {
  if (key === "q") return `${t("searchLabel")}: ${value}`;
  if (key === "categoryId") return categoryName(value);
  if (key === "condition") return `${t("conditionLabel")}: ${value}`;
  return `${t(key)}: $${value}`;
}

type FilterControlsProps = {
  filters: MarketFilters;
  onChange: (key: FilterKey, value: string) => void;
  idSuffix: string;
  categories: Category[];
  t: Translator;
};

function FilterControls({
  filters,
  onChange,
  idSuffix,
  categories,
  t,
}: FilterControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="sr-only" htmlFor={`market-search${idSuffix}`}>
          {t("searchLabel")}
        </label>
        <input
          id={`market-search${idSuffix}`}
          type="search"
          value={filters.q}
          onChange={(e) => onChange("q", e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="input-field min-h-11 flex-1"
        />
        <label className="sr-only" htmlFor={`market-category${idSuffix}`}>
          {t("filterCategory")}
        </label>
        <select
          id={`market-category${idSuffix}`}
          value={filters.categoryId}
          onChange={(e) => onChange("categoryId", e.target.value)}
          className="input-field min-h-11 md:w-48"
        >
          <option value="">{t("allCategories")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`market-condition${idSuffix}`}>
          {t("filterCondition")}
        </label>
        <select
          id={`market-condition${idSuffix}`}
          value={filters.condition}
          onChange={(e) => onChange("condition", e.target.value)}
          className="input-field min-h-11 md:w-40"
        >
          <option value="">{t("allConditions")}</option>
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          {t("minPrice")}
          <input
            type="number"
            min={0}
            value={filters.minPrice}
            onChange={(e) => onChange("minPrice", e.target.value)}
            className="input-field min-h-10 w-28"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          {t("maxPrice")}
          <input
            type="number"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => onChange("maxPrice", e.target.value)}
            className="input-field min-h-10 w-28"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          {t("locationLabel")}
          <select
            disabled
            aria-label={t("locationLabel")}
            className="input-field min-h-10 w-44"
          >
            <option>{t("locationUnavailable")}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
