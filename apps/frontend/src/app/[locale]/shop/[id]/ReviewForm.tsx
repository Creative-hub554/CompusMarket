"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

type EligibleItem = { orderItemId: string; createdAt: string };
type NewReview = {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  createdAt: string;
  user: { name: string | null };
};

export function ReviewForm({
  productId,
  onCreated,
}: {
  productId: string;
  onCreated: (review: NewReview) => void;
}) {
  const t = useTranslations("product");
  const { data: session } = useSession();
  const [eligible, setEligible] = useState<EligibleItem[] | null>(null);
  const [orderItemId, setOrderItemId] = useState<string>("");
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetch(`/api/products/${productId}/reviewable`)
      .then((res) => (res.ok ? res.json() : []))
      .then((items: EligibleItem[]) => {
        if (cancelled) return;
        setEligible(items);
        setOrderItemId(items[0]?.orderItemId ?? "");
      })
      .catch(() => !cancelled && setEligible([]));
    return () => {
      cancelled = true;
    };
  }, [session, productId]);

  if (!session) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("loginToReview")}
      </p>
    );
  }

  if (eligible === null) return null;

  if (eligible.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("noEligiblePurchase")}
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, rating, comment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("reviewFailed"));
      }
      const review: NewReview = await res.json();
      onCreated(review);
      setComment("");
      setRating(5);
      const remaining = (eligible ?? []).filter((i) => i.orderItemId !== orderItemId);
      setEligible(remaining);
      setOrderItemId(remaining[0]?.orderItemId ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reviewFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-[var(--border-subtle)] p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {t("writeReview")}
      </h3>

      {eligible.length > 1 && (
        <select
          value={orderItemId}
          onChange={(e) => setOrderItemId(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
        >
          {eligible.map((item) => (
            <option key={item.orderItemId} value={item.orderItemId}>
              {t("purchaseOn", { date: new Date(item.createdAt).toLocaleDateString() })}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setRating(star)}
            className={`text-xl ${star <= rating ? "text-yellow-500" : "text-slate-300"}`}
            aria-label={`${star}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder={t("reviewCommentPlaceholder")}
        className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !orderItemId}
        className="btn-primary disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("submitReview")}
      </button>
    </form>
  );
}
