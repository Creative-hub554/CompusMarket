"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/stores/cart";

export function AddToCartButton({ productId }: { productId: string }) {
  const t = useTranslations("addToCart");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  async function handleAdd() {
    setLoading(true);
    try {
      await addItem(productId, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      alert(t("loginRequired"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className={`w-full rounded-lg py-3 text-white font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95 ${
        added
          ? "bg-green-600 hover:bg-green-700"
          : "bg-khmer-red hover:bg-khmer-red-light"
      } disabled:opacity-50`}
    >
      {loading ? (
        <span className="inline-block animate-pulse">{t("adding")}</span>
      ) : added ? (
        <span className="inline-flex items-center gap-1">{t("added")}</span>
      ) : (
        t("add")
      )}
    </button>
  );
}
