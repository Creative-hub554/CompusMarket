"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

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
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    images: string[];
  };
  orderItem: {
    id: string;
    price: number;
    order: { id: string; createdAt: string };
  };
  createdAt: string;
};

export default function WarrantyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [warranty, setWarranty] = useState<Warranty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [claimReason, setClaimReason] = useState("");
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetch(`/api/warranties/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setWarranty)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleClaim() {
    if (!claimReason.trim()) return;
    setClaiming(true);
    const res = await fetch(`/api/warranties/${id}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: claimReason }),
    });
    if (res.ok) {
      const updated = await res.json();
      setWarranty(updated);
      setShowClaimForm(false);
    }
    setClaiming(false);
  }

  if (loading)
    return <div className="mx-auto max-w-4xl px-4 py-8">Loading...</div>;

  if (error || !warranty) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Warranty Not Found</h1>
        <Link href="/warranties" className="text-indigo-600 hover:underline">
          &larr; Back to Warranties
        </Link>
      </div>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(warranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/warranties"
        className="text-sm text-indigo-600 hover:underline mb-4 block"
      >
        &larr; My Warranties
      </Link>

      <h1 className="text-2xl font-bold mb-6">
        Warranty for {warranty.product.name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-2">Product</h2>
          <p className="font-medium">{warranty.product.name}</p>
          <p className="text-sm text-gray-500">
            Price: ${warranty.product.price}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {warranty.product.description}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-2">Coverage</h2>
          <p className="text-sm">{warranty.months} months</p>
          <p className="text-sm mt-1">
            {new Date(warranty.startDate).toLocaleDateString()} →{" "}
            {new Date(warranty.endDate).toLocaleDateString()}
          </p>
          {warranty.status === "ACTIVE" && daysLeft > 0 && (
            <p className="text-sm text-green-600 font-medium mt-2">
              {daysLeft} days remaining
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4 col-span-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Status</h2>
              <p className="text-sm mt-1">{warranty.status}</p>
              {warranty.claimStatus && (
                <p className="text-sm mt-1">
                  Claim Status:{" "}
                  <span className="font-medium">{warranty.claimStatus}</span>
                </p>
              )}
            </div>
            {warranty.status === "ACTIVE" && !warranty.claimStatus && (
              <button
                onClick={() => setShowClaimForm(!showClaimForm)}
                className="px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition"
              >
                File a Claim
              </button>
            )}
          </div>

          {showClaimForm && (
            <div className="mt-4 border-t pt-4">
              <label className="block text-sm font-medium mb-2">
                Reason for claim
              </label>
              <textarea
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={3}
                placeholder="Describe the issue with your product..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleClaim}
                  disabled={claiming || !claimReason.trim()}
                  className="px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50 transition"
                >
                  {claiming ? "Submitting..." : "Submit Claim"}
                </button>
                <button
                  onClick={() => setShowClaimForm(false)}
                  className="px-4 py-2 border text-sm rounded hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {warranty.claimReason && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-medium mb-1">Claim Details</h3>
              <p className="text-sm text-gray-600">{warranty.claimReason}</p>
              {warranty.claimDate && (
                <p className="text-xs text-gray-400 mt-1">
                  Submitted on{" "}
                  {new Date(warranty.claimDate).toLocaleDateString()}
                </p>
              )}
              {warranty.notes && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Seller notes:</span>{" "}
                  {warranty.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
