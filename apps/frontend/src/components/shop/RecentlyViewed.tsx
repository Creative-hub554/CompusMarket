"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, type Product } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";
import { getRecentlyViewed, recordProductView } from "@/lib/recentlyViewed";

/**
 * Records the current product view and shows a "Recently viewed" row
 * (excluding the current product). Renders nothing when there's no history.
 */
export function RecentlyViewed({ currentId }: { currentId: string }) {
  const t = useTranslations("product");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    recordProductView(currentId);
    const ids = getRecentlyViewed().filter((id) => id !== currentId);
    if (ids.length === 0) return;
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Product[]) => {
        // Preserve the recency order from localStorage.
        const byId = new Map((Array.isArray(data) ? data : []).map((p) => [p.id, p]));
        setProducts(ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p)));
      })
      .catch(() => {});
  }, [currentId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight mb-4 text-slate-900 dark:text-slate-100">
        {t("recentlyViewed")}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            price={p.price}
            condition={p.condition}
            images={(p.images as string[]) || []}
            categoryName={p.category?.name}
          />
        ))}
      </div>
    </section>
  );
}
