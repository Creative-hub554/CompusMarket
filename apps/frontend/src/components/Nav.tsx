"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { useTranslations } from "next-intl";
import { SearchBar } from "./SearchBar";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsBell } from "./social/NotificationsBell";
import { Avatar } from "./social/Avatar";
import { useCartStore } from "@/stores/cart";
import { Button } from "@theo/ui";

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Nav() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [msgUnread, setMsgUnread] = useState(0);
  const { data: session, status, signOut } = useSession();
  const cartItems = useCartStore((s) => s.items);
  const initialized = useCartStore((s) => s.initialized);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const signedIn = status === "authenticated";

  useEffect(() => {
    if (!initialized && signedIn) {
      fetchCart();
    } else if (!initialized) {
      useCartStore.setState({ initialized: true });
    }
  }, [initialized, signedIn, fetchCart]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    const poll = () => {
      fetch("/api/threads")
        .then((r) => (r.ok ? r.json() : []))
        .then((threads: { unreadCount: number }[]) => {
          if (active) {
            setMsgUnread(
              Array.isArray(threads)
                ? threads.reduce((sum, th) => sum + (th.unreadCount || 0), 0)
                : 0
            );
          }
        })
        .catch(() => {});
    };
    poll();
    const timer = setInterval(poll, 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [session?.user?.id]);

  /* Shared dropdown panel classes: opens on hover AND keyboard focus. */
  const panelCls =
    "absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50";
  const itemCls =
    "block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gold hover:text-slate-900 transition-colors whitespace-nowrap";
  const groupLabelCls =
    "px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400";

  return (
    <nav className="bg-slate-900/85 backdrop-blur-xl text-white border-b border-[rgba(212,160,39,0.25)] shadow-[0_4px_24px_-8px_rgba(212,160,39,0.35)] sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 gap-2">
        <Link href="/" className="shrink-0 animate-fade-in no-underline flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/champey-mark.svg" alt="" width={34} height={34} className="drop-shadow-[0_0_10px_rgba(212,160,39,0.5)]" />
          <div>
            <div className="text-lg sm:text-xl font-bold tracking-[0.12em] leading-none text-white">
              champey
            </div>
            <div className="text-[10px] sm:text-[11px] tracking-[0.28em] text-gold-light font-medium mt-0.5 text-right">
              bytheo
            </div>
          </div>
        </Link>

        <div className="hidden md:block flex-1 max-w-xs">
          <SearchBar />
        </div>

        {/* Desktop nav: 3 pillars */}
        <div className="hidden md:flex gap-5 lg:gap-7 text-sm font-medium items-center">
          {/* Social */}
          <div className="relative group">
            <button aria-haspopup="true" className="nav-link opacity-90 hover:opacity-100">
              {t("social")}
            </button>
            <div className={`${panelCls} bg-white dark:bg-slate-900 rounded-lg shadow-xl py-1 min-w-44 border border-[rgba(212,160,39,0.3)] dark:border-[rgba(212,160,39,0.22)]`}>
              <Link href="/feed" className={itemCls}>
                {t("feed")}
              </Link>
              <Link href="/community/groups" className={itemCls}>
                {t("groups")}
              </Link>
              <Link href="/community" className={itemCls}>
                {t("community")}
              </Link>
              <Link href="/messages" className={`${itemCls} flex items-center gap-1`}>
                {t("messages")}
                {msgUnread > 0 && (
                  <span className="bg-red-600 text-white text-xs rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
                    {msgUnread > 99 ? "99+" : msgUnread}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Market */}
          <div className="relative group">
            <button aria-haspopup="true" className="nav-link opacity-90 hover:opacity-100">
              {t("market")}
            </button>
            <div className={`${panelCls} grid grid-cols-2 gap-x-2 bg-white dark:bg-slate-900 rounded-lg shadow-xl pb-2 min-w-72 border border-[rgba(212,160,39,0.3)] dark:border-[rgba(212,160,39,0.22)]`}>
              <div>
                <p className={groupLabelCls}>{t("buying")}</p>
                <Link href="/shop" className={itemCls}>
                  {t("shop")}
                </Link>
                <Link href="/market" className={itemCls}>
                  {t("market")}
                </Link>
                <Link href="/orders" className={itemCls}>
                  {t("orders")}
                </Link>
                <Link href="/warranties" className={itemCls}>
                  {t("warranties")}
                </Link>
              </div>
              <div>
                <p className={groupLabelCls}>{t("selling")}</p>
                <Link href="/seller/dashboard" className={itemCls}>
                  {t("seller")}
                </Link>
                <Link href="/seller/products" className={itemCls}>
                  {t("products")}
                </Link>
                <Link href="/seller/orders" className={itemCls}>
                  {t("sellerOrders")}
                </Link>
              </div>
            </div>
          </div>

          {/* Jobs */}
          <div className="relative group">
            <button aria-haspopup="true" className="nav-link opacity-90 hover:opacity-100">
              {t("jobs")}
            </button>
            <div className={`${panelCls} right-auto bg-white dark:bg-slate-900 rounded-lg shadow-xl py-1 min-w-48 border border-[rgba(212,160,39,0.3)] dark:border-[rgba(212,160,39,0.22)]`}>
              <Link href="/jobs" className={itemCls}>
                {t("jobBoard")}
              </Link>
              <Link href="/jobs/post" className={itemCls}>
                {t("postJob")}
              </Link>
              <Link href="/jobs/my-applications" className={itemCls}>
                {t("myApplications")}
              </Link>
              <Link href="/community/resume" className={itemCls}>
                {t("resume")}
              </Link>
            </div>
          </div>

          {/* Cart icon */}
          <Link
            href="/cart"
            aria-label={t("cart")}
            className="relative p-1 rounded hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <CartBadge count={itemCount} />
          </Link>

          <ThemeToggle />
          <LocaleSwitcher />
          {session?.user ? (
            <>
              <NotificationsBell />
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 opacity-90 hover:opacity-100"
                  aria-label="Account menu"
                >
                  <Avatar
                    user={{
                      name: session.user.name,
                      image: (session.user as { image?: string | null }).image,
                    }}
                    size={30}
                  />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-lg shadow-xl py-1 min-w-44 z-50 border border-[rgba(212,160,39,0.3)] dark:border-[rgba(212,160,39,0.22)]">
                    <Link
                      href={`/profile/${session.user.id}`}
                      onClick={() => setMenuOpen(false)}
                      className={itemCls}
                    >
                      {t("myProfile")}
                    </Link>
                    <Link
                      href="/profile/edit"
                      onClick={() => setMenuOpen(false)}
                      className={itemCls}
                    >
                      {t("editProfile")}
                    </Link>
                    <Link
                      href="/saved"
                      onClick={() => setMenuOpen(false)}
                      className={itemCls}
                    >
                      {t("savedPosts")}
                    </Link>
                    {session.user.role === "ADMIN" && (
                      <Link
                        href="/admin/users"
                        onClick={() => setMenuOpen(false)}
                        className={itemCls}
                      >
                        {t("admin")}
                      </Link>
                    )}
                    <Link
                      href="/support"
                      onClick={() => setMenuOpen(false)}
                      className={itemCls}
                    >
                      {t("helpSupport")}
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      {t("signOut")}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button onClick={() => router.push("/login")}>{t("signIn")}</Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 rounded hover:bg-[var(--surface-2)] transition-colors"
          aria-label={t("toggleMenu")}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile search + accordion nav */}
      {open && (
        <div className="md:hidden border-t border-[rgba(212,160,39,0.25)] px-4 py-3 space-y-2 animate-slide-down" style={{ background: "var(--surface)" }}>
          <SearchBar />

          {/* Social */}
          <details className="group">
            <summary className="flex items-center justify-between rounded px-3 py-2 cursor-pointer font-semibold hover:bg-[var(--surface-2)] transition-colors" style={{ color: "var(--text-body)" }}>
              {t("social")}
              <span className="text-xs opacity-70">▾</span>
            </summary>
            <div className="pl-4 flex flex-col gap-1 text-sm">
              <Link href="/feed" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("feed")}
              </Link>
              <Link href="/community/groups" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("groups")}
              </Link>
              <Link href="/community" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("community")}
              </Link>
              <Link href="/messages" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors flex items-center gap-1">
                {t("messages")}
                {msgUnread > 0 && (
                  <span className="bg-red-600 text-white text-xs rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
                    {msgUnread > 99 ? "99+" : msgUnread}
                  </span>
                )}
              </Link>
            </div>
          </details>

          {/* Market */}
          <details className="group">
            <summary className="flex items-center justify-between rounded px-3 py-2 cursor-pointer font-semibold hover:bg-[var(--surface-2)] transition-colors" style={{ color: "var(--text-body)" }}>
              {t("market")}
              <span className="text-xs opacity-70">▾</span>
            </summary>
            <div className="pl-4 flex flex-col gap-1 text-sm">
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider opacity-60">{t("buying")}</p>
              <Link href="/shop" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("shop")}
              </Link>
              <Link href="/market" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("market")}
              </Link>
              <Link href="/orders" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("orders")}
              </Link>
              <Link href="/warranties" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("warranties")}
              </Link>
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider opacity-60">{t("selling")}</p>
              <Link href="/seller/dashboard" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("seller")}
              </Link>
              <Link href="/seller/products" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("products")}
              </Link>
              <Link href="/seller/orders" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("sellerOrders")}
              </Link>
            </div>
          </details>

          {/* Jobs */}
          <details className="group">
            <summary className="flex items-center justify-between rounded px-3 py-2 cursor-pointer font-semibold hover:bg-[var(--surface-2)] transition-colors" style={{ color: "var(--text-body)" }}>
              {t("jobs")}
              <span className="text-xs opacity-70">▾</span>
            </summary>
            <div className="pl-4 flex flex-col gap-1 text-sm">
              <Link href="/jobs" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("jobBoard")}
              </Link>
              <Link href="/jobs/post" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("postJob")}
              </Link>
              <Link href="/jobs/my-applications" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("myApplications")}
              </Link>
              <Link href="/community/resume" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors">
                {t("resume")}
              </Link>
            </div>
          </details>

          {/* Cart */}
          <Link
            href="/cart"
            onClick={() => setOpen(false)}
            className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors flex items-center gap-2"
          >
            {t("cart")}
            <CartBadge count={itemCount} />
          </Link>

          <div className="pt-1 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            {session?.user ? (
              <>
                <Link
                  href={`/profile/${session.user.id}`}
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors block"
                >
                  {t("myProfile")}
                </Link>
                <Link
                  href="/profile/edit"
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors block"
                >
                  {t("editProfile")}
                </Link>
                <Link
                  href="/support"
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-2 hover:bg-[var(--surface-2)] transition-colors block"
                >
                  {t("helpSupport")}
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="w-full text-left rounded px-3 py-2 text-amber-600 dark:text-amber-400 hover:bg-[var(--surface-2)] transition-colors"
                >
                  {t("signOut")}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded px-3 py-2 font-semibold text-amber-600 dark:text-amber-400 hover:bg-[var(--surface-2)] transition-colors block"
              >
                {t("signIn")}
              </Link>
            )}
            <div className="px-3 py-2">
              <ThemeToggle />
          <LocaleSwitcher />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
