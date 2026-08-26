"use client";


import { toast } from "@/components/ui/toast";
import { useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/stores/cart";

export default function CartPage() {
  const router = useRouter();
  const t = useTranslations("cart");
  const items = useCartStore((s) => s.items);
  const loading = useCartStore((s) => s.loading);
  const initialized = useCartStore((s) => s.initialized);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    if (!initialized) fetchCart();
  }, [initialized, fetchCart]);

  async function checkout() {
    const res = await fetch("/api/orders", { method: "POST" });
    if (!res.ok) {
      toast.error(t("checkoutFailed"));
      return;
    }
    const order = await res.json();
    router.push(`/orders/${order.id}`);
  }

  if (loading)
    return <div className="mx-auto max-w-4xl px-4 py-8">{t("loading")}</div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("emptyTitle")}</h1>
        <Link href="/shop" className="text-gold-600 hover:underline">
          {t("continueShopping")}
        </Link>
      </div>
    );
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-600 hover:underline"
        >
          {t("clearCart")}
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-lg border p-4"
          >
            <div className="h-20 w-20 flex-shrink-0 bg-[var(--surface-2)] rounded flex items-center justify-center">
              {item.product.images?.[0] ? (
                <Image
                  src={item.product.images[0]}
                  alt={item.product.name}
                  width={80}
                  height={80}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-xs">{t("noImage")}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Link
                href={`/shop/${item.product.id}`}
                className="font-medium hover:text-gold-600 truncate block"
              >
                {item.product.name}
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ${Number(item.product.price).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="h-8 w-8 rounded border hover:bg-[var(--surface-2)]"
              >
                -
              </button>
              <span className="w-8 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="h-8 w-8 rounded border hover:bg-[var(--surface-2)]"
                disabled={item.quantity >= item.product.stock}
              >
                +
              </button>
            </div>

            <p className="w-24 text-right font-medium">
              ${(Number(item.product.price) * item.quantity).toLocaleString()}
            </p>

            <button
              onClick={() => removeItem(item.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              {t("remove")}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="flex items-center justify-between text-lg font-bold">
          <span>{t("total")}</span>
          <span>${total.toLocaleString()}</span>
        </div>
        <button
          onClick={checkout}
          className="mt-4 w-full rounded-lg bg-gold-600 py-3 text-white font-medium hover:bg-gold-700 transition"
        >
          {t("checkout")}
        </button>
      </div>
    </div>
  );
}
