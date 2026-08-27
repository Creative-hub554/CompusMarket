"use client";

import { useLocale, useTranslations } from "next-intl";

interface LocalizedBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

export function LocalizedBadge({ children, variant = "default", className }: LocalizedBadgeProps) {
  const locale = useLocale();
  const t = useTranslations("ui");

  const variantClasses = {
    default: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    secondary: "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300",
    destructive: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    outline: "border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}