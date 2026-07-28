"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type SellerDocument = {
  id: string;
  type: string;
  url: string;
  filename: string;
};

type SellerDetail = {
  id: string;
  accountType: string;
  verificationStatus: string;
  phone: string | null;
  address: string | null;
  reviewNotes: string | null;
  verifiedAt: string | null;
  createdAt: string;
  user: { name: string | null; email: string; createdAt: string };
  documents: SellerDocument[];
  reviewer: { name: string | null; email: string } | null;
  _count: { products: number };
};

export default function AdminSellerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/sellers/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setSeller(data);
        setNotes(data.reviewNotes || "");
      })
      .catch((err) => { console.error("Failed to load seller:", err); setError(true); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/sellers/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      router.push("/admin/sellers");
    } catch (err) {
      console.error("Failed to approve seller:", err);
      setError(true);
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/sellers/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/admin/sellers");
    } catch (err) {
      console.error("Failed to reject seller:", err);
      setError(true);
    }
    setProcessing(false);
  };

  if (loading) return <div>Loading...</div>;

  if (error || !seller) {
    return <div className="text-red-600">Failed to load seller application.</div>;
  }

  const statusColor =
    seller.verificationStatus === "APPROVED"
      ? "text-green-600"
      : seller.verificationStatus === "REJECTED"
      ? "text-red-600"
      : "text-yellow-600";

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.push("/admin/sellers")} className="text-sm text-blue-600 hover:underline mb-4 block">
        &larr; Back to applications
      </button>

      <h1 className="text-2xl font-bold mb-2">
        {seller.user.name || seller.user.email}
      </h1>
      <p className={`font-medium mb-6 ${statusColor}`}>
        {seller.verificationStatus} &middot; {seller.accountType}
      </p>

      <div className="space-y-6">
        {/* Applicant Info */}
        <section className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Applicant Info</h2>
          <p className="text-sm text-gray-600">Email: {seller.user.email}</p>
          <p className="text-sm text-gray-600">Phone: {seller.phone || "—"}</p>
          <p className="text-sm text-gray-600">Address: {seller.address || "—"}</p>
          <p className="text-sm text-gray-600">
            Products: {seller._count.products}
          </p>
          <p className="text-sm text-gray-600">
            Applied: {new Date(seller.createdAt).toLocaleDateString()}
          </p>
          {seller.reviewer && (
            <p className="text-sm text-gray-600">
              Reviewed by: {seller.reviewer.name || seller.reviewer.email}
            </p>
          )}
          {seller.verifiedAt && (
            <p className="text-sm text-gray-600">
              Verified: {new Date(seller.verifiedAt).toLocaleDateString()}
            </p>
          )}
        </section>

        {/* Documents */}
        <section className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Documents</h2>
          {seller.documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents uploaded.</p>
          ) : (
            <div className="space-y-2">
              {seller.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                  <div>
                    <p className="text-sm font-medium">
                      {doc.type === "ID" ? "Government ID" : "Business License"}
                    </p>
                    <p className="text-xs text-gray-500">{doc.filename}</p>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Review */}
        {seller.verificationStatus === "PENDING" && (
          <section className="border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Review Application</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Add notes about this application..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Approve"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Reject"}
                </button>
              </div>
            </div>
          </section>
        )}

        {seller.reviewNotes && (
          <section className="border rounded-lg p-4 bg-gray-50">
            <h2 className="font-semibold mb-1">Review Notes</h2>
            <p className="text-sm text-gray-700">{seller.reviewNotes}</p>
          </section>
        )}
      </div>
    </div>
  );
}
