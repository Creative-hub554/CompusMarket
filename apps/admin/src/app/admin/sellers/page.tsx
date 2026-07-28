"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SellerProfile = {
  id: string;
  accountType: string;
  verificationStatus: string;
  phone: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
  _count: { products: number };
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/admin/sellers")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(setSellers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? sellers : sellers.filter((s) => s.verificationStatus === filter);

  if (loading) return <div>Loading seller applications...</div>;

  if (error) {
    return <div className="text-red-600">Failed to load sellers. Admin access required.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Seller Applications</h1>

      <div className="flex gap-2 mb-6">
        {["all", "PENDING", "APPROVED", "REJECTED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filter === f
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500">No seller applications found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-lg border p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.user.name || s.user.email}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        statusColors[s.verificationStatus] || "bg-gray-100"
                      }`}
                    >
                      {s.verificationStatus}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {s.accountType}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {s.user.email} &middot; {s._count.products} products &middot; Applied{" "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/admin/sellers/${s.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
