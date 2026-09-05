"use client";

import { useState, useEffect } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { useTranslations } from "next-intl";
import { Home, Store, ShoppingBag, Briefcase, MessageCircle } from "lucide-react";
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

type NavItem = { href: string; label: string };

export function Nav() {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // mobile drawer
  const [accountOpen, setAccountOpen] = useState(false); // avatar menu
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

  const itemCls =
    "block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gold hover:text-slate-900 transition-colors whitespace-nowrap";
  const groupLabelCls =
    "px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]";

  // Center icon tabs — the 4 core destinations.
  const tabs = [
    { href: "/feed", label: t("feed"), Icon: Home, isActive: (p: string) => p.startsWith("/feed") },
    { href: "/shop", label: t("shop"), Icon: Store, isActive: (p: string) => p.startsWith("/shop") },
    { href: "/market", label: t("market"), Icon: ShoppingBag, isActive: (p: string) => p.startsWith("/market") },
    { href: "/jobs", label: t("jobs"), Icon: Briefcase, isActive: (p: string) => p.startsWith("/jobs") },
  ];

  // Secondary links shown in the mobile drawer (desktop uses sidebars).
  const moreGroups: { label: string; items: NavItem[] }[] = [
    {
      label: t("community"),
      items: [
        { href: "/community", label: t("community") },
        { href: "/community/groups", label: t("groups") },
      ],
    },
    {
      label: t("selling"),
      items: [
        { href: "/seller/dashboard", label: t("seller") },
        { href: "/seller/products", label: t("products") },
        { href: "/seller/orders", label: t("sellerOrders") },
      ],
    },
    {
      label: t("buying"),
      items: [
        { href: "/orders", label: t("orders") },
        { href: "/warranties", label: t("warranties") },
      ],
    },
    {
      label: t("jobs"),
      items: [
        { href: "/jobs/post", label: t("postJob") },
        { href: "/jobs/my-applications", label: t("myApplications") },
        { href: "/community/resume", label: t("resume") },
      ],
    },
  ];

  const panelCls =
    "absolute right-0 top-full mt-2 rounded-xl border border-[rgba(255,107,94,0.3)] dark:border-[rgba(255,107,94,0.22)] bg-white dark:bg-slate-900 shadow-xl z-50";

  return (
    <nav className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex max-w-6xl items-center gap-2 rounded-2xl border border-[rgba(255,107,94,0.22)] bg-slate-900/85 px-3 py-2.5 text-white shadow-[0_12px_40px_-16px_rgba(255,107,94,0.5)] backdrop-blur-xl sm:px-4">
        {/* Left: logo + search */}
        <Link href="/" className="shrink-0 no-underline flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/champey-mark.svg" alt="" width={38} height={38} className="drop-shadow-[0_0_10px_rgba(255,107,94,0.5)]" />
          <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            champey
          </span>
        </Link>
        <div className="hidden flex-1 max-w-xs md:block">
          <SearchBar />
        </div>

        {/* Center: icon tabs */}
        <div className="mx-auto hidden items-center gap-1 md:flex">
          {tabs.map(({ href, label, Icon, isActive }) => {
            const active = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={label}
                className={`relative flex h-11 w-16 items-center justify-center rounded-xl transition-all duration-200 lg:w-20 ${
                  active
                    ? "bg-gradient-to-br from-gold to-gold-light text-white shadow-[0_6px_18px_-6px_rgba(255,107,94,0.7)]"
                    : "text-slate-300 hover:bg-[rgba(255,107,94,0.15)] hover:text-white"
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.4 : 2} />
              </Link>
            );
          })}
        </div>

        {/* Right: cart, messages, notifications, theme, locale, account */}
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/cart"
            aria-label={t("cart")}
            title={t("cart")}
            className="relative p-2 rounded-xl hover:bg-[rgba(255,107,94,0.15)] transition-colors"
          >
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <CartBadge count={itemCount} />
          </Link>

          <Link
            href="/messages"
            aria-label={t("messages")}
            title={t("messages")}
            className="relative p-2 rounded-xl hover:bg-[rgba(255,107,94,0.15)] transition-colors"
          >
            <MessageCircle size={22} />
            {msgUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
                {msgUnread > 99 ? "99+" : msgUnread}
              </span>
            )}
          </Link>

          <NotificationsBell />
          <ThemeToggle />
          <LocaleSwitcher />

          {session?.user ? (
            <div className="relative">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center p-1 rounded-xl hover:bg-[rgba(255,107,94,0.15)] transition-colors"
                aria-label="Account menu"
              >
                <Avatar
                  user={{
                    name: session.user.name,
                    image: (session.user as { image?: string | null }).image,
                  }}
                  size={32}
                />
              </button>
              {accountOpen && (
                <div className={`${panelCls} min-w-52 py-1`}>
                  <Link href={`/profile/${session.user.id}`} onClick={() => setAccountOpen(false)} className={itemCls}>
                    {t("myProfile")}
                  </Link>
                  <Link href="/profile/edit" onClick={() => setAccountOpen(false)} className={itemCls}>
                    {t("editProfile")}
                  </Link>
                  <Link href="/saved" onClick={() => setAccountOpen(false)} className={itemCls}>
                    {t("savedPosts")}
                  </Link>
                  {session.user.role === "ADMIN" && (
                    <Link href="/admin/users" onClick={() => setAccountOpen(false)} className={itemCls}>
                      {t("admin")}
                    </Link>
                  )}
                  <Link href="/support" onClick={() => setAccountOpen(false)} className={itemCls}>
                    {t("helpSupport")}
                  </Link>
                  <button
                    onClick={() => {
                      setAccountOpen(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-600 hover:text-white transition-colors"
                  >
                    {t("signOut")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={() => router.push("/login")}>{t("signIn")}</Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 rounded-xl hover:bg-[rgba(255,107,94,0.15)] transition-colors"
          aria-label={t("toggleMenu")}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden mt-2 rounded-2xl border border-[var(--border-subtle)] px-4 py-3 space-y-1 animate-slide-down" style={{ background: "var(--surface)" }}>
          <SearchBar />

          {tabs.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 font-semibold hover:bg-[var(--surface-2)] transition-colors"
              style={{ color: "var(--text-body)" }}
            >
              {label}
            </Link>
          ))}

          {moreGroups.map((g) => (
            <div key={g.label}>
              <p className={groupLabelCls}>{g.label}</p>
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-[var(--surface-2)] transition-colors block"
                  style={{ color: "var(--text-body)" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}

          <Link
            href="/cart"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 hover:bg-[var(--surface-2)] transition-colors flex items-center gap-2"
            style={{ color: "var(--text-body)" }}
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
                  className="rounded-lg px-3 py-2 hover:bg-[var(--surface-2)] transition-colors block"
                >
                  {t("myProfile")}
                </Link>
                <Link
                  href="/profile/edit"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-[var(--surface-2)] transition-colors block"
                >
                  {t("editProfile")}
                </Link>
                <Link
                  href="/support"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-[var(--surface-2)] transition-colors block"
                >
                  {t("helpSupport")}
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="w-full text-left rounded-lg px-3 py-2 text-amber-600 dark:text-amber-400 hover:bg-[var(--surface-2)] transition-colors"
                >
                  {t("signOut")}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 font-semibold text-amber-600 dark:text-amber-400 hover:bg-[var(--surface-2)] transition-colors block"
              >
                {t("signIn")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
