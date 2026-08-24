import { routing } from "@/i18n/routing";

export const SITE_NAME = "Champey";
export const SITE_DESCRIPTION =
  "Social · Market · Careers — Cambodia's all-in-one platform";

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function localePath(locale: string, path: string): string {
  return `${getSiteUrl()}/${locale}${path === "/" ? "" : path}`;
}

export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {
    "x-default": localePath(routing.defaultLocale, path),
  };
  for (const locale of routing.locales) {
    languages[locale] = localePath(locale, path);
  }
  return languages;
}
