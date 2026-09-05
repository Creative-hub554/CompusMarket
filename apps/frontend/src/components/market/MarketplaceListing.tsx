"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Store } from "lucide-react";

export type MarketplaceListingProduct = {
  id: string;
  name: string;
  price: number;
  condition: string;
  images: string[];
  categoryName?: string;
};

/** Compact marketplace listing card, interspersed between social posts. */
export function MarketplaceListing({ product }: { product: MarketplaceListingProduct }) {
  const t = useTranslations("market");

  return (
    <Link
      href={`/shop/${product.id}`}
      className="block rounded-2xl border p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
      style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Store size={14} className="text-gold-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-300">
            {t("title")}
          </span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {t("sponsored")}
        </span>
      </div>

      <div className="flex gap-3">
        <div
          className="w-20 h-20 rounded-xl overflow-hidden shrink-0"
          style={{ background: "var(--surface-2)" }}
        >
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
              <Store size={24} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 py-0.5">
          <p className="font-semibold text-sm truncate" style={{ color: "var(--text-body)" }}>
            {product.name}
          </p>
          {product.categoryName && (
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {product.categoryName}
            </p>
          )}
          <p className="text-base font-extrabold bg-gradient-to-r from-gold-600 to-gold-500 bg-clip-text text-transparent dark:from-gold-400 dark:to-gold-300 mt-1">
            ${Number(product.price).toLocaleString()}
          </p>
        </div>
      </div>
    </Link>
  );
}
