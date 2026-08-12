"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "@/services/api";

type Stats = {
  totalUsers: number;
  totalProducts: number;
  totalCategories: number;
  activeSellers: number;
  pendingSellerApps: number;
  pendingWarrantyClaims: number;
  openSupportTickets: number;
  lowStockProducts: { id: string; name: string; stock: number }[];
  totalRevenue: number;
  revenueLast30Days: number;
  ordersPerDay: { date: string; revenue: number; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { productId: string; name: string; units: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  PROCESSING: "#3b82f6",
  SHIPPED: "#8b5cf6",
  DELIVERED: "#10b981",
  CANCELLED: "#ef4444",
};

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!session) {
    return <p className="p-8 text-slate-500">Sign in required.</p>;
  }

  if (error) {
    return <p className="p-8 text-red-600">{error}</p>;
  }

  if (!stats) {
    return <p className="p-8 text-slate-500">Loading...</p>;
  }

  const statusData = stats.ordersByStatus.map((s) => ({
    ...s,
    name: s.status.toLowerCase(),
  }));

  const kpis = [
    { label: "Total Revenue", value: `$${stats.totalRevenue.toLocaleString()}` },
    { label: "Revenue (30d)", value: `$${stats.revenueLast30Days.toLocaleString()}` },
    { label: "Total Users", value: stats.totalUsers.toLocaleString() },
    { label: "Products", value: stats.totalProducts.toLocaleString() },
    { label: "Categories", value: stats.totalCategories.toLocaleString() },
    { label: "Active Sellers", value: stats.activeSellers.toLocaleString() },
    { label: "Pending Sellers", value: stats.pendingSellerApps.toLocaleString() },
    { label: "Pending Warranty Claims", value: stats.pendingWarrantyClaims.toLocaleString() },
    { label: "Open Support Tickets", value: stats.openSupportTickets.toLocaleString() },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-white shadow-sm p-4">
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {stats.lowStockProducts.length > 0 && (
        <div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="font-semibold text-yellow-800 mb-2">Low Stock Alerts</h2>
          <ul className="space-y-1 text-sm text-yellow-800">
            {stats.lowStockProducts.map((p) => (
              <li key={p.id}>
                {p.name} — {p.stock} left
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="rounded-lg border bg-white shadow-sm p-4">
          <h2 className="font-semibold mb-4">Revenue — Last 30 Days</h2>
          {stats.ordersPerDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.ordersPerDay}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-slate-500 text-sm">
              No orders in the last 30 days.
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-white shadow-sm p-4">
          <h2 className="font-semibold mb-4">Orders by Status</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  label={(props) => {
                    const { name, count } = props as { name?: string; count?: number };
                    return `${name}: ${count}`;
                  }}
                >
                  {statusData.map((s) => (
                    <Cell
                      key={s.status}
                      fill={STATUS_COLORS[s.status] || "#9ca3af"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-slate-500 text-sm">No orders yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white shadow-sm p-4">
          <h2 className="font-semibold mb-4">Top Products (units sold)</h2>
          {stats.topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="units" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-slate-500 text-sm">
              No sales yet.
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-white shadow-sm p-4">
          <h2 className="font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/products"
              className="rounded border px-4 py-3 text-sm font-medium hover:bg-slate-50"
            >
              Products
            </Link>
            <Link
              href="/admin/categories"
              className="rounded border px-4 py-3 text-sm font-medium hover:bg-slate-50"
            >
              Categories
            </Link>
            <Link
              href="/admin/orders"
              className="rounded border px-4 py-3 text-sm font-medium hover:bg-slate-50"
            >
              Orders
            </Link>
            <Link
              href="/admin/sellers"
              className="rounded border px-4 py-3 text-sm font-medium hover:bg-slate-50"
            >
              Sellers
            </Link>
            <Link
              href="/admin/warranties"
              className="rounded border px-4 py-3 text-sm font-medium hover:bg-slate-50"
            >
              Warranties
            </Link>
            <Link
              href="/admin/articles"
              className="rounded border px-4 py-3 text-sm font-medium hover:bg-slate-50"
            >
              Articles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
