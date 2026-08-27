"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

interface LocalizedSearchProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
}

export function LocalizedSearch({ placeholder, className, onSearch }: LocalizedSearchProps) {
  const locale = useLocale();
  const t = useTranslations("nav");
  const [query, setQuery] = useState("");
  const router = useRouter();

  const defaultPlaceholder = locale === "km" 
    ? t("searchPlaceholder") 
    : t("searchPlaceholder");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/shop?search=${encodeURIComponent(query.trim())}`);
      onSearch?.(query.trim());
    }
  };

  // Debounce search for better UX
  useEffect(() => {
    if (query.trim()) {
      const timeoutId = setTimeout(() => {
        onSearch?.(query.trim());
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [query, onSearch]);

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center ${className}`}
      style={{
        backgroundColor: "var(--surface)",
        border: `1px solid var(--border-subtle)`,,
        borderRadius: "0.5rem",
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || defaultPlaceholder}
        className="w-full px-4 py-2 rounded-lg"
        style={{
          backgroundColor: "var(--surface)",
          color: "var(--text-body)",
          border: "none",
          outline: "none",
        }}
      />

      <button
        type="submit"
        className="px-4 py-2 rounded-r-lg font-medium"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {locale === "km" ? "ស្វែង" : "Search"}
      </button>
    </form>
  );
}