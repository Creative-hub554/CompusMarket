"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session-client";
import { useLocale, useTranslations } from "next-intl";
import {
  BriefcaseBusiness,
  FilePlus2,
  Group,
  Plus,
  Store,
  X,
} from "lucide-react";

export const createItems = [
  { key: "post", href: "/feed", Icon: FilePlus2 },
  { key: "listing", href: "/seller/products/new", Icon: Store },
  { key: "job", href: "/jobs/post", Icon: BriefcaseBusiness },
  { key: "page", href: "/pages/new", Icon: FilePlus2 },
  { key: "group", href: "/community/groups", Icon: Group },
] as const;

export function CreateMenu({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const localePath = `/${locale}${pathname === "/" ? "" : pathname}`;
  const currentContext = `${localePath}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const returnTo = encodeURIComponent(currentContext);

  return (
    <div className={mobile ? "relative" : "relative hidden sm:block"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={
          mobile
            ? "flex flex-col items-center justify-center gap-0.5 text-xs text-[var(--color-accent)]"
            : "inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)]"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("create")}
      >
        <span
          className={
            mobile
              ? "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] text-white"
              : ""
          }
        >
          {mobile ? (
            <Plus size={21} aria-hidden />
          ) : (
            <Plus size={18} aria-hidden />
          )}
        </span>
        <span>{t("create")}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("create")}
          className={
            mobile
              ? "absolute bottom-full left-1/2 mb-3 w-64 -translate-x-1/2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2 text-left shadow-lg"
              : "absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2 shadow-lg"
          }
        >
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-sm font-semibold">{t("create")}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("closeCreate")}
              className="rounded-md p-1 hover:bg-[var(--surface-2)]"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          {!session && (
            <p className="px-2 pb-2 text-xs text-[var(--text-muted)]">
              {t("createAuthHint")}
            </p>
          )}
          <div className="space-y-1">
            {createItems.map(({ key, href, Icon }) => (
              <Link
                key={key}
                href={`${href}?returnTo=${returnTo}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-[var(--surface-2)]"
              >
                <Icon size={18} aria-hidden />
                <span>{t(`create${key[0].toUpperCase()}${key.slice(1)}`)}</span>
              </Link>
            ))}
          </div>
          {!session && (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 block border-t border-[var(--border-subtle)] px-2 pt-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              {t("signIn")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
