"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("nav");

  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="font-bold tracking-[0.15em]">KHMERONLINESHOP</p>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} KHMERONLINESHOP. {t("footerRights")}
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link
            href="/terms/buyer"
            className="text-slate-300 hover:text-white transition-colors"
          >
            {t("buyerTerms")}
          </Link>
          <Link
            href="/terms/seller"
            className="text-slate-300 hover:text-white transition-colors"
          >
            {t("sellerTerms")}
          </Link>
          <Link
            href="/support"
            className="text-slate-300 hover:text-white transition-colors"
          >
            {t("helpSupport")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
