"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: { id: string; product: { name: string } }[];
};

export default function OrdersPage() {
  const t = useTranslations("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => {
        if (r.status === 401) throw new Error("Unauthorized");
        if (!r.ok) throw new Error("Server error");
        return r.json();
      })
      .then(setOrders)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl animate-shimmer" />
        ))}
      </div>
    );

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">
          {t("errorTitle")}
        </h1>
        <p className="text-gray-600 mb-4">{t("errorDesc")}</p>
        <Link href="/login" className="text-gold-600 hover:underline">
          {t("signInToView")}
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-gold-100 text-gold-800",
    SHIPPED: "bg-gold-100 text-gold-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">{t("empty")}</p>
          <Link href="/shop" className="text-gold-600 hover:underline">
            {t("startShopping")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-lg border p-4 hover:border-gold-300 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {t("orderNumber", {
                      id: order.id.slice(0, 8).toUpperCase(),
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.items.length === 1
                      ? t("itemCount", { count: order.items.length })
                      : t("itemCountPlural", {
                          count: order.items.length,
                        })}{" "}
                    &middot; {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      statusColors[order.status] || "bg-gray-100"
                    }`}
                  >
                    {order.status}
                  </span>
                  <p className="mt-1 font-bold">
                    ${Number(order.total).toLocaleString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
