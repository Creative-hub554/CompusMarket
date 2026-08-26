"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { api, type PromoProduct } from "@/services/api";
import { useCartStore } from "@/stores/cart";

const SHOW_DELAY_MS = 5000;
const DISMISS_KEY = "market-promo-dismissed";

export function PromoVideoPopup() {
  const t = useTranslations("market");
  const [promo, setPromo] = useState<PromoProduct | null>(null);
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) {
      return;
    }

    let active = true;
    api.products
      .promos()
      .then((promos) => {
        if (!active || !Array.isArray(promos) || promos.length === 0) return;
        setPromo(promos[Math.floor(Math.random() * promos.length)]);
        timerRef.current = setTimeout(() => {
          if (active) setVisible(true);
        }, SHOW_DELAY_MS);
      })
      .catch(() => {});

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const buyNow = async () => {
    if (!promo || added) return;
    try {
      await useCartStore.getState().addItem(promo.id, 1);
      setAdded(true);
      setTimeout(dismiss, 1500);
    } catch {
      // Cart add failed (e.g. signed out): send them to the product page.
      window.location.assign(`/shop/${promo.id}`);
    }
  };

  if (!promo || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("promoAriaLabel")}
      className="glass-card fixed bottom-4 right-4 z-[60] w-64 overflow-hidden animate-slide-up"
    >
      <button
        onClick={dismiss}
        aria-label={t("promoDismiss")}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
      >
        ✕
      </button>

      <Link href={`/shop/${promo.id}`} onClick={dismiss}>
        <div className="relative bg-slate-900">
          <video
            src={promo.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="h-44 w-full object-cover"
          />
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {t("promoBadge")}
          </span>
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
            {promo.name}
          </p>
          <p className="text-sm font-bold text-gold-600 dark:text-gold-400">
            ${Number(promo.price).toFixed(2)}
          </p>
        </div>
      </Link>

      <div className="px-3 pb-3">
        <button
          onClick={buyNow}
          disabled={added}
          className={`w-full rounded-lg py-2 text-sm font-semibold text-white transition-colors ${
            added ? "bg-green-600" : "bg-gold-600 hover:bg-gold-700"
          }`}
        >
          {added ? t("promoAdded") : t("promoBuyNow")}
        </button>
      </div>
    </div>
  );
}
