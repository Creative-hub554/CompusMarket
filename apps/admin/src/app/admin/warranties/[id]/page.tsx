"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Warranty = {
  id: string;
  status: string;
  months: number;
  startDate: string;
  endDate: string;
  claimDate: string | null;
  claimReason: string | null;
  claimStatus: string | null;
  notes: string | null;
  product: { id: string; name: string; description: string; price: number; images: string[] };
  user: { name: string | null; email: string | null };
  orderItem: { id: string; price: number; order: { id: string; createdAt: string } };
  createdAt: string;
  updatedAt: string;
};

export default function WarrantyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [warranty, setWarranty] = useState<Warranty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/warranties/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setWarranty)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction(action: "approve" | "reject") {
    setActionLoading(true);
    const res = await fetch(`/api/admin/warranties/${id}/${action}`, {
      method: "PATCH",
    });
    if (res.ok) {
      const updated = await res.json();
      setWarranty(updated);
    }
    setActionLoading(false);
  }

  async function saveNotes(notes: string) {
    const res = await fetch(`/api/admin/warranties/${id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      const updated = await res.json();
      setWarranty(updated);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error || !warranty) return <div className="text-red-600">Warranty not found</div>;

  const daysLeft = Math.ceil(
    (new Date(warranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div>
      <Link href="/admin/warranties" className="text-sm text-blue-600 hover:underline mb-4 block">
        &larr; Back to Warranties
      </Link>

      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">
          Warranty #{warranty.id.slice(0, 8).toUpperCase()}
        </h1>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">Product</h2>
            <p className="font-medium">{warranty.product.name}</p>
            <p className="text-sm text-gray-500">Price: ${warranty.product.price}</p>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">Customer</h2>
            <p className="font-medium">{warranty.user.name || "No name"}</p>
            <p className="text-sm text-gray-500">{warranty.user.email}</p>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">Warranty Period</h2>
            <p className="text-sm">
              {new Date(warranty.startDate).toLocaleDateString()} →{" "}
              {new Date(warranty.endDate).toLocaleDateString()}
            </p>
            <p className="text-sm mt-1">
              {daysLeft > 0 ? (
                <span className="text-green-600">{daysLeft} days remaining</span>
              ) : (
                <span className="text-red-600">Expired</span>
              )}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">Status</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{warranty.status}</span>
              {warranty.claimStatus && (
                <span className="text-sm">| Claim: {warranty.claimStatus}</span>
              )}
            </div>
          </div>

          {warranty.claimReason && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h2 className="font-semibold mb-2">Claim Details</h2>
              <p className="text-sm mb-2">
                <span className="font-medium">Reason:</span> {warranty.claimReason}
              </p>
              {warranty.claimDate && (
                <p className="text-sm">
                  <span className="font-medium">Claimed on:</span>{" "}
                  {new Date(warranty.claimDate).toLocaleDateString()}
                </p>
              )}
              {warranty.claimStatus === "PENDING" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve Claim
                  </button>
                  <button
                    onClick={() => handleAction("reject")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject Claim
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">Admin Notes</h2>
            <textarea
              defaultValue={warranty.notes || ""}
              onBlur={(e) => saveNotes(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
              placeholder="Add notes..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}