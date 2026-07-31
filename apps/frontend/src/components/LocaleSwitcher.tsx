"use client";

import { useLocale } from "next-intl";

export function LocaleSwitcher() {
  const locale = useLocale();

  function switchLocale(next: "en" | "km") {
    if (next === locale) return;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <button
        onClick={() => switchLocale("km")}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === "km" ? "text-khmer-gold" : "text-white/60 hover:text-white"
        }`}
      >
        ខ្មែរ
      </button>
      <span className="text-white/30">|</span>
      <button
        onClick={() => switchLocale("en")}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === "en" ? "text-khmer-gold" : "text-white/60 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
}
