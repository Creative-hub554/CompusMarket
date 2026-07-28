"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Warranty = {
  id: string;
  status: string;
  months: number;
  startDate: string;
  endDate: string;
  claimStatus: string | null;
  product: { name: string; images: string[] };
  createdAt: string;
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-800",
  CLAIMED: "bg-orange-100 text-orange-800",
  VOID: "bg-red-100 text-red-800",
};

export default function MyWarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/warranties")
      .then((r) => {
        if (r.status === 401) throw new Error("Unauthorized");
        if (!r.ok) throw new Error("Server error");
        return r.json();
      })
      .then(setWarranties)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-8">Loading...</div>;

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4 text-khmer-red">Something went wrong</h1>
        <p className="text-gray-600 mb-4">Unable to load your warranties. You may need to sign in.</p>
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in to view your warranties
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Warranties</h1>

      {warranties.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">No warranties yet</p>
          <Link href="/shop" className="text-blue-600 hover:underline">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {warranties.map((w) => {
            const daysLeft = Math.ceil(
              (new Date(w.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return (
              <Link
                key={w.id}
                href={`/warranties/${w.id}`}
                className="block rounded-lg border p-4 hover:border-blue-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{w.product.name}</p>
                    <p className="text-sm text-gray-500">
                      {w.months} month warranty &middot;{" "}
                      {new Date(w.startDate).toLocaleDateString()} →{" "}
                      {new Date(w.endDate).toLocaleDateString()}
                    </p>
                    {w.status === "ACTIVE" && daysLeft > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        {daysLeft} days remaining
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        statusColors[w.status] || "bg-gray-100"
                      }`}
                    >
                      {w.status}
                    </span>
                    {w.claimStatus && (
                      <p className="text-xs text-orange-600 mt-1">
                        Claim: {w.claimStatus}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <div className="mt-8 text-center">
        <Link href="/support/new" className="inline-block rounded-lg border border-red-300 px-6 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
          Need help with a warranty? Contact Support
        </Link>
      </div>
    </div>
  );
}