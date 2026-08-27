"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type LocalizedCartProps = {
  items: CartItem[];
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemoveItem?: (id: string) => void;
  className?: string;
};

export function LocalizedCart({ items, onUpdateQuantity, onRemoveItem, className }: LocalizedCartProps) {
  const locale = useLocale();
  const t = useTranslations("cart");

  const formatPrice = (price: number) => {
    return locale === "km" 
      ? `${(price * 4100).toLocaleString("km-KH", { minimumFractionDigits: 2 })} ${t("currencyKHR")}`
      : `$${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  const getEmptyMessage = () => {
    return locale === "km" ? t("emptyTitle") : t("emptyTitle");
  };

  const getContinueShoppingText = () => {
    return locale === "km" ? t("continueShopping") : t("continueShopping");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-body)" }}>
          {t("title")}
        </h2>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {items.length} {items.length === 1 ? t("item") : t("items")}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
          <p className="text-lg mb-4">{getEmptyMessage()}</p>
          <button
            className="px-4 py-2 rounded-lg font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {getContinueShoppingText()}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg"
                style={{ backgroundColor: "var(--surface-2)" }}
              />

              <div className="flex-1">
                <h3 className="font-medium" style={{ color: "var(--text-body)" }}>
                  {item.name}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {formatPrice(item.price)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity?.(item.id, Math.max(1, item.quantity - 1))}
                  className="w-8 h-8 rounded-full font-medium"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    color: "var(--text-body)",
                  }}
                >
                  -
                </button>
                <span className="w-8 text-center font-medium" style={{ color: "var(--text-body)" }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
                  className="w-8 h-8 rounded-full font-medium"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    color: "var(--text-body)",
                  }}
                >
                  +
                </button>
              </div>

              <button
                onClick={() => onRemoveItem?.(item.id)}
                className="w-8 h-8 rounded-full font-medium text-red-600 hover:bg-red-50"
                style={{ backgroundColor: "var(--surface-2)" }}
              >
                ×
              </button>
            </div>
          ))}

          <div className="pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold" style={{ color: "var(--text-body)" }}>
                {t("total")}
              </span>
              <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                {formatPrice(items.reduce((sum, item) => sum + item.price * item.quantity, 0))}
              </span>
            </div>

            <button
              className="w-full py-3 rounded-lg font-medium"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {t("checkout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}