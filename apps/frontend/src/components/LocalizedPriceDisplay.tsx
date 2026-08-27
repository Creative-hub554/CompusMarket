"use client";

import { useLocale, useTranslations } from "next-intl";

interface LocalizedPriceDisplayProps {
  price: number;
  currency?: "USD" | "KHR";
  className?: string;
  showCurrencySymbol?: boolean;
}

export function LocalizedPriceDisplay({ 
  price, 
  currency = "USD", 
  className,
  showCurrencySymbol = true 
}: LocalizedPriceDisplayProps) {
  const locale = useLocale();
  const t = useTranslations("price");

  const formatPrice = (amount: number, curr: "USD" | "KHR") => {
    if (curr === "KHR") {
      // Convert USD to KHR (approximate rate)
      const khrAmount = amount * 4100;
      return new Intl.NumberFormat(locale === "km" ? "km-KH" : "en-US", {
        style: "currency",
        currency: "KHR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(khrAmount);
    } else {
      return new Intl.NumberFormat(locale === "km" ? "en-US" : "en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  };

  return (
    <span className={`font-semibold ${className}`} style={{ color: "var(--primary)" }}>
      {showCurrencySymbol ? formatPrice(price, currency) : formatPrice(price, currency).replace(/[$€£]/g, "")}
    </span>
  );
}