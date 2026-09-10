"use client";

import { toast } from "@/components/ui/toast";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/stores/cart";

/**
 * Buy now: adds the product to the cart, then sends the buyer straight to the
 * cart page (the app's checkout screen) so they can confirm and place the
 * order. Falls back to the add-to-cart flow when the user is signed out.
 */
export function BuyNowButton({ productId }: { productId: string }) {
  const t = useTranslations("addToCart");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  async function handleBuyNow() {
    setLoading(true);
    try {
      await addItem(productId, 1);
      router.push("/cart");
    } catch {
      toast.error(t("loginRequired"));
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBuyNow}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
    >
      {loading ? t("adding") : t("buyNow")}
    </button>
  );
}