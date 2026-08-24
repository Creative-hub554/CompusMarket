"use client";


import { toast } from "@/components/ui/toast";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import OrderItemTimeline from "@/components/OrderItemTimeline";

type OrderItem = {
  id: string;
  status: string;
  quantity: number;
  price: number;
  trackingNumber: string | null;
  packedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  product: { name: string; images: string[]; price: number };
  feedback: { rating: number; comment: string | null; images: string[] } | null;
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  user: { name: string | null; email: string };
  items: OrderItem[];
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-indigo-100 text-indigo-800",
  PACKING: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-[var(--surface-2)] text-slate-800 dark:text-slate-200",
};

type Action = "APPROVED" | "REJECTED" | "PACKING" | "SHIPPED";

const NEXT_ACTIONS: Record<
  string,
  { action: Action; label: string; color: string }[]
> = {
  PENDING: [
    {
      action: "APPROVED",
      label: "Approve Order",
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      action: "REJECTED",
      label: "Reject",
      color: "bg-red-600 hover:bg-red-700",
    },
  ],
  APPROVED: [
    {
      action: "PACKING",
      label: "Start Packing",
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
  ],
  PACKING: [
    {
      action: "SHIPPED",
      label: "Mark as Shipped",
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
  ],
  SHIPPED: [],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

export default function SellerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    fetch(`/api/seller/orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (itemId: string, status: string) => {
    const body: Record<string, any> = { status };
    if (status === "SHIPPED" && trackingInputs[itemId]?.trim()) {
      body.trackingNumber = trackingInputs[itemId].trim();
    }
    const res = await fetch(`/api/seller/orders/items/${itemId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Failed");
      return;
    }
    const updated = await res.json();
    setOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, ...updated } : i,
        ),
      };
    });
  };

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <Link
          href="/login"
          className="text-indigo-600 font-medium hover:underline"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (loading)
    return <div className="max-w-3xl mx-auto px-4 py-8">Loading...</div>;
  if (!order)
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-red-600">
        Order not found.
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <button
        onClick={() => router.push("/seller/orders")}
        className="text-sm text-indigo-600 hover:underline mb-4 block"
      >
        &larr; Back to orders
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <span className="text-sm text-slate-400">
          {new Date(order.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="bg-[var(--surface-2)] rounded-lg p-4 mb-6">
        <p className="text-sm font-medium">
          Buyer: {order.user.name || order.user.email}
        </p>
      </div>

      <div className="space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 bg-[var(--surface)]">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-16 h-16 bg-[var(--surface-2)] rounded-lg overflow-hidden shrink-0">
                {item.product.images?.[0] ? (
                  <Image
                    src={item.product.images[0]}
                    alt=""
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                    img
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.product.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[item.status] || "bg-[var(--surface-2)]"}`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Qty: {item.quantity} &middot; ${item.price.toFixed(2)}{" "}
                  &middot; Total: ${(item.price * item.quantity).toFixed(2)}
                </p>
                {item.trackingNumber && (
                  <p className="text-xs text-slate-400 mt-1">
                    Tracking: {item.trackingNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="mb-3">
              <OrderItemTimeline
                status={item.status}
                trackingNumber={item.trackingNumber}
                packedAt={item.packedAt}
                shippedAt={item.shippedAt}
                deliveredAt={item.deliveredAt}
              />
            </div>

            {/* Actions */}
            {NEXT_ACTIONS[item.status]?.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                {item.status === "PACKING" && (
                  <div className="flex gap-2 items-center mb-2">
                    <input
                      type="text"
                      value={trackingInputs[item.id] || ""}
                      onChange={(e) =>
                        setTrackingInputs((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="Tracking number (optional)"
                      className="flex-1 border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  {NEXT_ACTIONS[item.status].map((action) => (
                    <button
                      key={action.action}
                      onClick={() => updateStatus(item.id, action.action)}
                      className={`px-4 py-1.5 rounded text-white text-sm font-medium transition-all hover:scale-105 ${action.color}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            {item.feedback && (
              <div className="mt-3 pt-3 border-t bg-green-50 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800">
                  Buyer Feedback &middot; {item.feedback.rating}/5
                </p>
                {item.feedback.comment && (
                  <p className="text-sm text-green-700 mt-1">
                    &ldquo;{item.feedback.comment}&rdquo;
                  </p>
                )}
                {item.feedback.images?.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {item.feedback.images.map((url: string, i: number) => (
                      <Image
                        key={i}
                        src={url}
                        alt=""
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
