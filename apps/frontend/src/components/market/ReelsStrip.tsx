"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Play, X } from "lucide-react";
import { api, type PromoProduct } from "@/services/api";
import { useCartStore } from "@/stores/cart";
import { toast } from "@/components/ui/toast";

export function ReelsStrip() {
  const t = useTranslations("market");
  const [promos, setPromos] = useState<PromoProduct[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let activeReq = true;
    api.products
      .promos()
      .then((p) => {
        if (activeReq && Array.isArray(p)) setPromos(p);
      })
      .catch(() => {});
    return () => {
      activeReq = false;
    };
  }, []);

  useEffect(() => {
    if (active === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (promos.length === 0) return null;

  const openModal = (i: number) => {
    setActive(i);
    setAdded(false);
  };

  const closeModal = () => setActive(null);

  const buyNow = async () => {
    if (active === null || added) return;
    const promo = promos[active];
    try {
      await useCartStore.getState().addItem(promo.id, 1);
      setAdded(true);
      toast.success(t("promoAdded"));
    } catch {
      window.location.assign(`/shop/${promo.id}`);
    }
  };

  const current = active !== null ? promos[active] : null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold tracking-tight mb-3 text-slate-900 dark:text-slate-100">
        {t("reelsTitle")}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {promos.map((promo, i) => (
          <button
            key={promo.id}
            onClick={() => openModal(i)}
            className="group relative shrink-0 snap-start w-36 md:w-44 aspect-[9/16] rounded-2xl overflow-hidden bg-black ring-1 ring-[var(--border-subtle)] hover:ring-indigo-400/70 hover:-translate-y-1 transition-all shadow-[var(--shadow-soft)]"
            aria-label={`${t("reelsTitle")}: ${promo.name}`}
          >
            <video
              src={promo.videoUrl}
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100"
              onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform group-hover:scale-110">
                <Play size={18} className="ml-0.5 text-white" fill="currentColor" />
              </span>
            </span>
            <span className="absolute bottom-0 left-0 right-0 p-2.5 text-left">
              <span className="block text-xs font-semibold text-white truncate">
                {promo.name}
              </span>
              <span className="block text-xs font-bold text-amber-300">
                ${Number(promo.price).toFixed(2)}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Fullscreen player + buy sheet */}
      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.name}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in"
          onClick={closeModal}
        >
          <button
            onClick={closeModal}
            aria-label={t("close")}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
          >
            <X size={20} />
          </button>

          <div
            className="relative w-full max-w-[380px] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={current.videoUrl}
              autoPlay
              controls
              loop
              playsInline
              poster={current.images?.[0]}
              className="w-full max-h-[70vh] rounded-2xl object-contain bg-black"
            />
            <div className="glass-card mt-3 !bg-black/60 !border-white/15 p-3.5 flex items-center gap-3">
              <Link
                href={`/shop/${current.id}`}
                onClick={closeModal}
                className="flex-1 min-w-0 no-underline"
              >
                <p className="truncate text-sm font-semibold text-white">
                  {current.name}
                </p>
                <p className="text-sm font-bold text-amber-300">
                  ${Number(current.price).toFixed(2)}
                </p>
              </Link>
              <button
                onClick={buyNow}
                disabled={added}
                className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all ${
                  added
                    ? "bg-green-600"
                    : "bg-gradient-to-r from-indigo-500 to-violet-600 hover:scale-[1.03] active:scale-95"
                }`}
              >
                {added ? t("promoAdded") : t("promoBuyNow")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
