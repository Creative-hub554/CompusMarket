"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Product, Review } from "@/services/api";
import { ReviewForm } from "./ReviewForm";

type Tab = "description" | "specs" | "reviews" | "warranty";

const TABS: { id: Tab; label: string }[] = [
  { id: "description", label: "Description" },
  { id: "specs", label: "Specs" },
  { id: "reviews", label: "Reviews" },
  { id: "warranty", label: "Warranty" },
];

export function ProductTabs({ product }: { product: Product }) {
  const t = useTranslations("product");
  const [active, setActive] = useState<Tab>("description");
  const [reviews, setReviews] = useState<Review[]>(product.reviews || []);

  const conditionLabels: Record<string, string> = {
    A: t("conditionA"),
    B: t("conditionB"),
    C: t("conditionC"),
  };

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  function handleCreated(review: Review) {
    setReviews((prev) => [review, ...prev]);
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-[var(--border-subtle)] mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              active === tab.id
                ? "border-b-2 border-gold-600 text-gold-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "description" && (
        <div className="max-w-3xl">
          <h2 className="text-lg font-bold mb-2">{t("description")}</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
            {product.description}
          </p>
        </div>
      )}

      {active === "specs" && (
        <div className="max-w-3xl space-y-3 text-sm">
          {product.serialNumber && (
            <p className="text-slate-600 dark:text-slate-300">
              {t("serial", { serial: product.serialNumber })}
            </p>
          )}
          <p className="text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Category:</span>{" "}
            {product.category.name}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Condition:</span>{" "}
            {conditionLabels[product.condition] || product.condition}
          </p>
        </div>
      )}

      {active === "reviews" && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold">{t("reviews")}</h2>
            {reviews.length > 0 && (
              <span className="flex items-center gap-1 text-sm text-yellow-500">
                <span className="text-base">
                  {"★".repeat(Math.round(average))}
                  {"☆".repeat(5 - Math.round(average))}
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {average.toFixed(1)}
                </span>
                <span className="text-slate-400">({reviews.length})</span>
              </span>
            )}
          </div>

          {reviews.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t("noReviews")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-[var(--border-subtle)] p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-yellow-500">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                      <span className="text-sm font-medium">
                        {review.user.name || t("customer")}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-slate-700 dark:text-slate-300">{review.comment}</p>
                  )}
                  {review.images?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {review.images.map((url, i) => (
                        <Image
                          key={i}
                          src={url}
                          alt=""
                          width={56}
                          height={56}
                          className="w-14 h-14 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <ReviewForm productId={product.id} onCreated={handleCreated} />
          </div>
        </div>
      )}

      {active === "warranty" && (
        <div className="max-w-3xl text-sm">
          {product.warrantyMonths ? (
            <p className="text-slate-600 dark:text-slate-300">
              {t("warrantyMonths", { months: product.warrantyMonths })}
            </p>
          ) : (
            <p className="text-slate-600 dark:text-slate-300">No warranty included</p>
          )}
        </div>
      )}
    </div>
  );
}
