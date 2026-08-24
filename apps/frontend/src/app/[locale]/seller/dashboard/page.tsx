"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";

type SellerProfile = {
  id: string;
  accountType: "PERSONAL" | "BUSINESS";
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  reviewNotes: string | null;
  phone: string | null;
  address: string | null;
  _count?: { products: number };
};

export default function SellerDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seller/apply")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) setProfile(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Please sign in to view your seller dashboard.
        </p>
        <Link
          href="/login"
          className="text-indigo-600 font-medium hover:underline"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }

  const maxProducts = profile?.accountType === "BUSINESS" ? 10 : 5;

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-slate-900 text-white rounded-xl p-6 md:p-8 mb-8">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
      </div>

      {!profile ? (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            You haven&apos;t applied to become a seller yet.
          </p>
          <button
            onClick={() => router.push("/seller/apply")}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
          >
            Apply Now
          </button>
        </div>
      ) : profile.verificationStatus === "PENDING" ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            Application Pending
          </h2>
          <p className="text-yellow-700">
            Your seller application is being reviewed. This typically takes
            approximately 3 business days. We&apos;ll notify you once it&apos;s
            approved.
          </p>
        </div>
      ) : profile.verificationStatus === "REJECTED" ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Application Rejected
          </h2>
          {profile.reviewNotes && (
            <p className="text-red-700 mb-2">Reason: {profile.reviewNotes}</p>
          )}
          <p className="text-red-600 text-sm">
            You may submit a new application with corrected information.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              Seller Account Active
            </h2>
            <p className="text-green-700">
              Account Type: <strong>{profile.accountType}</strong>
            </p>
          </div>

          <div className="bg-[var(--surface)] border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Product Limit</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full"
                  style={{
                    width: `${Math.min(
                      ((profile._count?.products || 0) / maxProducts) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium">
                {profile._count?.products || 0} / {maxProducts}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/seller/products")}
              className="border border-[var(--border-subtle)] px-6 py-2 rounded hover:bg-[var(--surface-2)] transition-colors"
            >
              My Products
            </button>
            <button
              onClick={() => router.push("/seller/products/new")}
              disabled={(profile._count?.products || 0) >= maxProducts}
              className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Product
            </button>
            <button
              onClick={() => router.push("/seller/orders")}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Orders
            </button>
            <button
              onClick={() => router.push("/messages")}
              className="border border-[var(--border-subtle)] px-6 py-2 rounded hover:bg-[var(--surface-2)] transition-colors"
            >
              Messages
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
