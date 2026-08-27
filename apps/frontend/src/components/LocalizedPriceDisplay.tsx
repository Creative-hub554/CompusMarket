"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

type LocalizedPriceDisplayProps = {
  price: number;
  className?: string;
};

export function LocalizedPriceDisplay({ price, className }: LocalizedPriceDisplayProps) {
  const locale = useLocale();
  const t = useTranslations("price");

  const formattedPrice = useMemo(() => {
    if (!price || isNaN(price)) return "0.00";

    const absPrice = Math.abs(price);
    const sign = price < 0 ? "-" : "";

    if (locale === "km") {
      // Format for Khmer Riel (KHR)
      const khr = absPrice * 4100; // Approximate KHR rate
      return `${sign}${khr.toLocaleString("km-KH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${t("currencyKHR")}`;
    } else {
      // Format for USD
      return `${sign}$${absPrice.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }, [price, locale, t]);

  return (
    <span className={className} style={{ color: "var(--text-body)" }}>
      {formattedPrice}
    </span>
  );
}