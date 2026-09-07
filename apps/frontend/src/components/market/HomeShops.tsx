"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/social/Avatar";

type Shop = {
  id: string;
  userId: string;
  name: string;
  image: string | null;
  accountType: string;
  productCount: number;
};

/**
 * "Browse the shops" row on the Home hub. Each entry opens the shop's
 * storefront where shoppers can browse everything and ask the owner.
 */
export function HomeShops() {
  const marketT = useTranslations("market");
  const shopT = useTranslations("shop");
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/products/shops")
      .then((r) => r.json())
      .then((data: Shop[]) => {
        if (active && Array.isArray(data)) setShops(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (shops.length === 0) return null;

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5"
      style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{marketT("shopsTitle")}</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {marketT("sellersCount", { count: shops.length })}
          </p>
        </div>
        <Link
          href="/shop"
          className="text-sm font-semibold text-gold-600 hover:text-gold-700 transition-colors dark:text-gold-400 dark:hover:text-gold-300"
        >
          {shopT("title")} →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shops.map((shop) => (
          <Link
            key={shop.id}
            href={`/store/${shop.id}`}
            className="group flex min-w-40 flex-1 flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5"
            style={{ borderColor: "var(--border-subtle)", background: "var(--surface-2)" }}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-light p-0.5">
              <Avatar user={{ name: shop.name, image: shop.image }} size={52} />
            </span>
            <span className="block w-full truncate text-sm font-semibold" style={{ color: "var(--text-body)" }}>
              {shop.name}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {shopT("productsCount", { count: shop.productCount })}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
