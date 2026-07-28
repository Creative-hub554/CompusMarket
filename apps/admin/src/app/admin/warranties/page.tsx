"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WarrantyStatus, WarrantyClaimStatus } from "@theo/database";

type Warranty = {
  id: string;
  status: string;
  months: number;
  startDate: string;
  endDate: string;
  claimDate: string | null;
  claimReason: string | null;
  claimStatus: string | null;
  product: { name: string; images: string[] };
  user: { name: string | null; email: string | null };
  createdAt: string;
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-800",
  CLAIMED: "bg-orange-100 text-orange-800",
  VOID: "bg-red-100 text-red-800",
};

const claimStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function AdminWarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/admin/warranties")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(setWarranties)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? warranties : warranties.filter((w) => w.status === filter);

  if (loading) return <div>Loading warranties...</div>;

  if (error) {
    return <div className="text-red-600">Failed to load warranties. Admin access required.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Warranty Management</h1>

      <div className="flex gap-2 mb-6">
        {["all", "ACTIVE", "EXPIRED", "CLAIMED", "VOID"].map((f) => (
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
        <p className="text-gray-500">No warranties found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <div key={w.id} className="rounded-lg border p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-400">
                      #{w.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        statusColors[w.status] || "bg-gray-100"
                      }`}
                    >
                      {w.status}
                    </span>
                    {w.claimStatus && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          claimStatusColors[w.claimStatus]
                        }`}
                      >
                        Claim: {w.claimStatus}
                      </span>
                    )}
                  </div>
                  <p className="font-medium mt-1">{w.product.name}</p>
                  <p className="text-sm text-gray-500">
                    {w.user.name || w.user.email} &middot;{" "}
                    {w.months}mo warranty
                  </p>
                </div>
                <Link
                  href={`/admin/warranties/${w.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Details
                </Link>
              </div>

              <div className="text-xs text-gray-400">
                {new Date(w.startDate).toLocaleDateString()} →{" "}
                {new Date(w.endDate).toLocaleDateString()}
                {w.claimReason && (
                  <span className="block mt-1 italic">
                    Reason: {w.claimReason}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
