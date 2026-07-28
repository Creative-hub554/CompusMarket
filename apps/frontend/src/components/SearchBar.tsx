"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
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

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search products..."
          className="w-64 pl-10 pr-4 py-2 text-sm bg-white/15 text-white placeholder-white/50 border border-white/20 rounded-full focus:outline-none focus:border-khmer-gold focus:bg-white/20 transition-all"
          onFocus={() => results.length > 0 && setOpen(true)}
          aria-label="Search products"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full min-w-[300px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {results.map((hit) => (
              <Link
                key={hit.id}
                href={`/shop/${hit.id}`}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-100 last:border-0"
              >
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400 shrink-0">
                  {hit.images?.[0] ? (
                    <img src={hit.images[0]} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{hit.name}</p>
                  <p className="text-xs text-gray-400">
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
            className="block px-4 py-2 text-center text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100"
          >
            View all results
          </Link>
        </div>
      )}

      {open && query.trim().length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 text-center text-sm text-gray-400">
          No products found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}