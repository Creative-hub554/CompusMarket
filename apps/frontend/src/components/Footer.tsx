"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/*
 * Royal Luxe footer: the night-sky surface with hairline gold rules and
 * serif wordmark, mirroring the landing's own footer grammar. Values are
 * literal (the --lx-* tokens are scoped to .lx-root) and fold into the
 * shared token layer in the Phase 2 retint.
 */
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
      title: t("shop"),
      links: [
        { href: "/shop", label: t("shop") },
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
    <footer className="border-t border-[rgba(216,178,92,0.28)] bg-[linear-gradient(180deg,#14122b,#100e20)] text-[#f4f0e6] shadow-[0_-18px_48px_-28px_rgba(10,8,30,0.7)]">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/champey-mark.svg"
                alt=""
                width={32}
                height={32}
                className="drop-shadow-[0_0_10px_rgba(216,178,92,0.45)]"
              />
              <span
                className="text-lg tracking-tight"
                style={{ fontFamily: "var(--font-serif-display)", letterSpacing: "-0.01em" }}
              >
                champey
              </span>
            </div>
            <p className="mt-3 text-sm text-[rgba(244,240,230,0.64)] max-w-xs">
              Social · Market · Careers
            </p>
            <p className="mt-1.5 text-xs uppercase tracking-[0.28em] text-[#d8b25c]">
              bytheo
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8b25c]">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[rgba(244,240,230,0.72)] hover:text-[#d8b25c] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-[rgba(216,178,92,0.16)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[rgba(244,240,230,0.45)]">
          <p>
            © {new Date().getFullYear()} Champey. {t("footerRights")}
          </p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link href="/terms/buyer" className="hover:text-[#d8b25c] transition-colors">
              {t("buyerTerms")}
            </Link>
            <Link href="/terms/seller" className="hover:text-[#d8b25c] transition-colors">
              {t("sellerTerms")}
            </Link>
            <Link href="/support" className="hover:text-[#d8b25c] transition-colors">
              {t("helpSupport")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
