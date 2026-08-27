"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

interface LocalizedRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  readOnly?: boolean;
  className?: string;
}

export function LocalizedRating({ value, onChange, max = 5, readOnly = false, className }: LocalizedRatingProps) {
  const locale = useLocale();
  const t = useTranslations("rating");

  const [hoverValue, setHoverValue] = useState<number>(0);

  const handleClick = (index: number) => {
    if (!readOnly) {
      onChange?.(index + 1);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (!readOnly) {
      setHoverValue(index + 1);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverValue(0);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: max }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = hoverValue ? starValue <= hoverValue : starValue <= value;

        return (
          <button
            key={index}
            className={`text-2xl transition-colors ${
              isFilled ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"
            } ${!readOnly ? "cursor-pointer hover:text-yellow-500" : "cursor-default"}`}
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
          >
            ★
          </button>
        );
      })}
      <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>
        {t("rating")}
      </span>
    </div>
  );
}