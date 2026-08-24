"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("nav");

  const columns: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t("social"),
      links: [
        { href: "/feed", label: t("feed") },
        { href: "/community", label: t("community") },
        { href: "/messages", label: t("messages") },
      ],
    },
    {
      title: t("market"),
      links: [
        { href: "/shop", label: t("shop") },
        { href: "/market", label: t("market") },
        { href: "/orders", label: t("orders") },
        { href: "/seller/dashboard", label: t("seller") },
      ],
    },
    {
      title: t("jobs"),
      links: [
        { href: "/jobs", label: t("jobBoard") },
        { href: "/jobs/post", label: t("postJob") },
        { href: "/community/resume", label: t("resume") },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/10 bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/champey-mark.svg" alt="" width={32} height={32} />
              <span className="text-lg font-bold tracking-[0.12em]">champey</span>
            </div>
            <p className="mt-3 text-sm text-slate-400 max-w-xs">
              Social · Market · Careers
            </p>
            <p className="mt-1 text-xs tracking-[0.28em] text-indigo-400">
              bytheo
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-slate-300 hover:text-white transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} Champey. {t("footerRights")}
          </p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link href="/terms/buyer" className="hover:text-white transition-colors">
              {t("buyerTerms")}
            </Link>
            <Link href="/terms/seller" className="hover:text-white transition-colors">
              {t("sellerTerms")}
            </Link>
            <Link href="/support" className="hover:text-white transition-colors">
              {t("helpSupport")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
