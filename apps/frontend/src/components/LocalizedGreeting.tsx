"use client";

import { useLocale, useTranslations } from "next-intl";

interface LocalizedGreetingProps {
  name?: string;
  className?: string;
}

export function LocalizedGreeting({ name, className }: LocalizedGreetingProps) {
  const locale = useLocale();
  const t = useTranslations("greeting");

  const greeting = name ? t("helloWithName", { name }) : t("hello");

  return (
    <h1 className={`text-2xl font-bold ${className}`} style={{ color: "var(--text-body)" }}>
      {greeting}
    </h1>
  );
}