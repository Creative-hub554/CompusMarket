"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import en, { Translations } from "./locales/en";
import km from "./locales/km";

export type Locale = "en" | "km";

const translations: Record<Locale, Translations> = { en, km };

type TranslationContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
};

const TranslationContext = createContext<TranslationContextType>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const t = translations[locale];

  return (
    <TranslationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
