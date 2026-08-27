"use client";

import { useLocale, useTranslations } from "next-intl";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface LocalizedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
}

export const LocalizedButton = forwardRef<HTMLButtonElement, LocalizedButtonProps>(
  ({ className, children, ...props }, ref) => {
    const locale = useLocale();
    const t = useTranslations("ui");

    const buttonText = typeof children === "string" ? children : t("button");

    return (
      <button
        ref={ref}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${className}`}
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
        {...props}
      >
        {buttonText}
      </button>
    );
  }
);