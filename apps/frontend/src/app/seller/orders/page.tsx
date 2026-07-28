"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type OrderItem = {
  id: string;
  status: string;
  quantity: number;
  price: number;
  trackingNumber: string | null;
  packedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  product: { name: string; images: string[] };
  order: { id: string; user: { name: string | null; email: string } };
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  PACKING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export default function SellerOrdersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/seller/orders")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <Link href="/login" className="text-khmer-blue font-medium hover:underline">Go to Login</Link>
      </div>
    );
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  const pendingCount = items.filter((i) => i.status === "PENDING").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-2 gold-underline">Seller Orders</h1>
      <p className="text-sm text-gray-500 mt-3 mb-6">
        {items.length} total &middot; {pendingCount} pending approval
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "PENDING", "APPROVED", "PACKING", "SHIPPED", "DELIVERED", "REJECTED", "CANCELLED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filter === f
                ? "bg-khmer-blue text-white border-khmer-blue"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No orders found.</p>
      ) : (
        <div className="space-y-3 stagger-children">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="card-hover border rounded-lg p-4 bg-white cursor-pointer"
              onClick={() => router.push(`/seller/orders/${item.order.id}`)}
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {item.product.images?.[0] ? (
                    <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">img</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{item.product.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[item.status] || "bg-gray-100"}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Qty: {item.quantity} &middot; ${item.price.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Buyer: {item.order.user.name || item.order.user.email} &middot; Order #{item.order.id.slice(0, 8)}
                  </p>
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
