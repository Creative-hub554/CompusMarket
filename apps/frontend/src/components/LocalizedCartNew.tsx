"use client";

import { useLocale, useTranslations } from "next-intl";

interface LocalizedCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface LocalizedCartProps {
  items: LocalizedCartItem[];
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemoveItem?: (id: string) => void;
  className?: string;
}

export function LocalizedCart({ items, onUpdateQuantity, onRemoveItem, className }: LocalizedCartProps) {
  const locale = useLocale();
  const t = useTranslations("cart");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale === "km" ? "km-KH" : "en-US", {
      style: "currency",
      currency: locale === "km" ? "KHR" : "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className={`rounded-lg border p-4 ${className}`} style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-body)" }}>{t("title")}</h3>
      
      {items.length === 0 ? (
        <p className="text-center py-4" style={{ color: "var(--text-muted)" }}>{t("empty")}</p>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded border" style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
                <div className="flex-1">
                  <h4 className="font-medium" style={{ color: "var(--text-body)" }}>{item.name}</h4>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{formatPrice(item.price)}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity?.(item.id, Math.max(1, item.quantity - 1))}
                    className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium" style={{ color: "var(--text-body)" }}>{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={() => onRemoveItem?.(item.id)}
                  className="ml-2 p-2 rounded transition-colors hover:bg-red-100 dark:hover:bg-red-900"
                  style={{ color: "var(--text-muted)" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-3 flex justify-between items-center" style={{ borderColor: "var(--border-subtle)" }}>
            <span className="font-semibold" style={{ color: "var(--text-body)" }}>{t("total")}</span>
            <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>{formatPrice(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}