"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  // Locale-stripped path; the router re-localizes it for the target locale.
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: "en" | "km") {
    if (next === locale) return;
    // Cookie steers later visits to unprefixed paths (e.g. "/").
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;
    // localePrefix is "always", so switching means navigating to the other
    // prefixed path — a cookie + reload cannot do it. Read the query string
    // from the location at click time (no render-time hook, so static
    // rendering is unaffected).
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`${pathname}${search}`, { locale: next });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <button
        onClick={() => switchLocale("km")}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === "km" ? "text-amber-500" : "text-white/60 hover:text-white"
        }`}
      >
        ខ្មែរ
      </button>
      <span className="text-white/30">|</span>
      <button
        onClick={() => switchLocale("en")}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === "en" ? "text-amber-500" : "text-white/60 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
}
