"use client";

import { useLocale, useTranslations } from "next-intl";

type GreetingProps = {
  name: string;
  className?: string;
};

export function Greeting({ name, className }: GreetingProps) {
  const locale = useLocale();
  const t = useTranslations("greeting");

  const greeting = locale === "km" ? t("khmer") : t("english");

  return (
    <div className={className} style={{ color: "var(--text-body)" }}>
      <span>{greeting}</span>
      <span className="font-semibold"> {name}</span>
    </div>
  );
}