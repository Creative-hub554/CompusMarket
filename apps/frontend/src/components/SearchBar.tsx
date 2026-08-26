"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type SearchHit = {
  id: string;
  name: string;
  description: string;
  price: number;
  condition: string;
  status: string;
  categoryName: string;
  images: string[];
};

export function SearchBar() {
  const t = useTranslations("shop");
  const nav = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.hits || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const count = results.length;
    if (e.key === "ArrowDown" && count > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % count);
    } else if (e.key === "ArrowUp" && count > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        router.push(`/shop/${results[activeIndex].id}`);
        setOpen(false);
        setQuery("");
        setActiveIndex(-1);
        inputRef.current?.blur();
      } else if (query.trim()) {
        router.push(`/shop?q=${encodeURIComponent(query)}`);
        setOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const expanded = open && results.length > 0;

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          id="search-input"
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls="search-results-list"
          aria-activedescendant={
            activeIndex >= 0 ? `search-option-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={nav("searchPlaceholder")}
          className="w-64 pl-10 pr-4 py-2 text-sm bg-white/15 text-white placeholder-white/50 border border-white/20 rounded-full focus:outline-none focus:border-gold-400 focus:bg-white/20 transition-all"
          onFocus={() => results.length > 0 && setOpen(true)}
          aria-label={nav("searchPlaceholder")}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-[var(--border-subtle)] border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {expanded && (
        <div
          id="search-results-list"
          role="listbox"
          className="absolute top-full mt-2 w-full min-w-[300px] bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg shadow-lg z-50 overflow-hidden"
        >
          <div className="max-h-80 overflow-y-auto">
            {results.map((hit, i) => (
              <Link
                key={hit.id}
                id={`search-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                href={`/shop/${hit.id}`}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  setActiveIndex(-1);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center gap-3 px-4 py-3 transition border-b border-[var(--border-subtle)] last:border-0 ${
                  i === activeIndex
                    ? "bg-[var(--surface-2)]"
                    : "hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="w-10 h-10 bg-[var(--surface-2)] rounded flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 shrink-0">
                  {hit.images?.[0] ? (
                    <Image
                      src={hit.images[0]}
                      alt=""
                      width={40}
                      height={40}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{hit.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    ${hit.price} &middot; {hit.categoryName}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href={`/shop?q=${encodeURIComponent(query)}`}
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
            className="block px-4 py-2 text-center text-sm text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-950/40 border-t border-[var(--border-subtle)]"
          >
            {t("viewAllResults")}
          </Link>
        </div>
      )}

      {open && query.trim().length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full mt-2 w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg shadow-lg z-50 p-4 text-center text-sm text-gray-400 dark:text-slate-500">
          {t("noResults")} &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
