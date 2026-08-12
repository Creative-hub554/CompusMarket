"use client";

import { useState, useEffect } from "react";
import { OrderStatus } from "@theo/database";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; images: string[] };
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  user: { name: string | null; email: string | null };
  items: OrderItem[];
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const statusOptions = Object.values(OrderStatus);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(setOrders)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(orderId: string, status: string) {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    }
  }

  if (loading) return <div>Loading orders...</div>;

  if (error) {
    return <div className="text-red-600">Failed to load orders. Admin access required.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders Management</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.user.name || order.user.email} &middot;{" "}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className={`rounded px-2 py-1 text-sm font-medium border ${
                      statusColors[order.status] || "bg-gray-100"
                    }`}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span>{item.product.name} x{item.quantity}</span>
                    <span>${(Number(item.price) * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t flex justify-between font-bold">
                <span>Total</span>
                <span>${Number(order.total).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
