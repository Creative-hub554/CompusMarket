"use client";

import { useTranslations } from "next-intl";

interface GreetingProps {
  name?: string;
}

export function Greeting({ name }: GreetingProps) {
  const t = useTranslations("greeting");

  const defaultName = name || t("defaultName");
  const greeting = t("message", { name: defaultName });

  return (
    <div className="text-center py-4">
      <h2 className="text-2xl font-bold mb-2">
        {t("title")}
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-300">
        {greeting}
      </p>
    </div>
  );
}