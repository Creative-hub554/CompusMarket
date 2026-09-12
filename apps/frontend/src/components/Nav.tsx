"use client";

import { useState, useEffect } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { useTranslations } from "next-intl";
import { Home, Store, Briefcase, MessageCircle } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsBell } from "./social/NotificationsBell";
import { Avatar } from "./social/Avatar";
import { useCartStore } from "@/stores/cart";
import { Button } from "@theo/ui";
import { apiFetch, handleApiError } from "@/lib/apiFetch";

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 bg-[#a8532f] text-[#f4f0e6] text-[10px] rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}

type NavItem = { href: string; label: string };

/*
 * Royal Luxe chrome: the pill is a floating piece of the indigo night sky
 * (the landing hero's world) with temple-gold hairlines; the active tab is
 * a temple-gold lozenge carrying deep-ink ink. Values are literal here —
 * the --lx-* tokens are scoped to .lx-root — and fold into the shared
 * token layer in the Phase 2 retint. Temple gold #d8b25c (night) /
 * #b08d3e (deep), lacquer clay #a8532f badges, ivory ink #f4f0e6.
 */

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
      apiFetch<{ unreadCount: number }[]>("/api/threads")
        .then((threads) => {
          if (active) {
            setMsgUnread(
              Array.isArray(threads)
                ? threads.reduce((sum, th) => sum + (th.unreadCount || 0), 0)
                : 0
            );
          }
        })
        .catch((err) => handleApiError(err, "load unread message count", true));
    };
    poll();
    const timer = setInterval(poll, 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [session?.user?.id]);

  const itemCls =
    "block px-4 py-2 text-sm text-[rgba(244,240,230,0.64)] hover:bg-[rgba(216,178,92,0.12)] hover:text-[#f4f0e6] transition-colors whitespace-nowrap";
  const groupLabelCls =
    "px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]";

  // Center icon tabs — the core destinations. People lives inside the
  // Notifications panel (follow requests + suggestions); Market is Shop.
  const tabs = [
    { href: "/feed", label: t("feed"), Icon: Home, isActive: (p: string) => p.startsWith("/feed") },
    { href: "/shop", label: t("shop"), Icon: Store, isActive: (p: string) => p.startsWith("/shop") },
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
    "absolute right-0 top-full mt-2 rounded-xl border border-[rgba(216,178,92,0.28)] bg-[#1d1a3f] shadow-[0_24px_60px_-24px_rgba(8,6,24,0.9)] z-50";

  return (
    <nav className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div
        className="mx-auto flex max-w-6xl items-center gap-2 rounded-2xl border border-[rgba(216,178,92,0.28)] bg-[linear-gradient(120deg,rgba(20,18,43,0.94),rgba(29,26,63,0.88))] px-3 py-2.5 text-[#f4f0e6] shadow-[0_18px_48px_-20px_rgba(10,8,30,0.65),0_2px_10px_-4px_rgba(176,141,62,0.35)] backdrop-blur-xl sm:px-4"
        style={{ viewTransitionName: "site-header" }}
      >
        {/* Left: logo + search */}
        <Link href="/" className="shrink-0 no-underline flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/champey-mark.svg" alt="" width={38} height={38} className="drop-shadow-[0_0_10px_rgba(216,178,92,0.45)]" />
          <span
            className="text-lg tracking-tight text-[#f4f0e6]"
            style={{ fontFamily: "var(--font-serif-display)", letterSpacing: "-0.01em" }}
          >
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
                    ? "bg-gradient-to-br from-[#d8b25c] to-[#b08d3e] text-[#14122b] shadow-[0_8px_20px_-8px_rgba(176,141,62,0.9)]"
                    : "text-[rgba(244,240,230,0.72)] hover:bg-[rgba(216,178,92,0.12)] hover:text-[#f4f0e6]"
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
            className="relative p-2 rounded-xl hover:bg-[rgba(216,178,92,0.12)] transition-colors"
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
            className="relative p-2 rounded-xl hover:bg-[rgba(216,178,92,0.12)] transition-colors"
          >
            <MessageCircle size={22} />
            {msgUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#a8532f] text-[#f4f0e6] text-[10px] rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
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
                className="flex items-center p-1 rounded-xl hover:bg-[rgba(216,178,92,0.12)] transition-colors"
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
                  <Link href="/account" onClick={() => setAccountOpen(false)} className={itemCls}>
                    {t("dashboard")}
                  </Link>
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
                    className="w-full text-left px-4 py-2 text-sm text-[rgba(244,240,230,0.64)] hover:bg-[rgba(224,122,78,0.15)] hover:text-[#e07a4e] transition-colors"
                  >
                    {t("signOut")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="rounded-full bg-gradient-to-br from-[#d8b25c] to-[#b08d3e] px-4 py-1.5 text-sm font-semibold text-[#14122b] shadow-[0_6px_18px_-8px_rgba(176,141,62,0.8)] transition-transform hover:-translate-y-0.5"
            >
              {t("signIn")}
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 rounded-xl hover:bg-[rgba(216,178,92,0.12)] transition-colors"
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
        <div className="md:hidden mt-2 rounded-2xl border border-[rgba(216,178,92,0.28)] bg-[linear-gradient(160deg,#1d1a3f,#14122b)] px-4 py-3 space-y-1 animate-slide-down shadow-[0_24px_60px_-24px_rgba(8,6,24,0.9)]">
          <SearchBar />

          {tabs.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 font-semibold text-[rgba(244,240,230,0.85)] hover:bg-[rgba(216,178,92,0.12)] transition-colors"
            >
              {label}
            </Link>
          ))}

          {moreGroups.map((g) => (
            <div key={g.label}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#d8b25c]">{g.label}</p>
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-[rgba(244,240,230,0.72)] hover:bg-[rgba(216,178,92,0.12)] hover:text-[#f4f0e6] transition-colors block"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}

          <Link
            href="/cart"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 hover:bg-[rgba(216,178,92,0.12)] transition-colors flex items-center gap-2 text-[rgba(244,240,230,0.85)]"
          >
            {t("cart")}
            <CartBadge count={itemCount} />
          </Link>

          <div className="pt-1 border-t" style={{ borderColor: "rgba(216,178,92,0.2)" }}>
            {session?.user ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-[rgba(216,178,92,0.12)] transition-colors block text-[rgba(244,240,230,0.85)]"
                >
                  {t("dashboard")}
                </Link>
                <Link
                  href={`/profile/${session.user.id}`}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-[rgba(216,178,92,0.12)] transition-colors block text-[rgba(244,240,230,0.85)]"
                >
                  {t("myProfile")}
                </Link>
                <Link
                  href="/profile/edit"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-[rgba(216,178,92,0.12)] transition-colors block text-[rgba(244,240,230,0.85)]"
                >
                  {t("editProfile")}
                </Link>
                <Link
                  href="/support"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-[rgba(216,178,92,0.12)] transition-colors block text-[rgba(244,240,230,0.85)]"
                >
                  {t("helpSupport")}
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="w-full text-left rounded-lg px-3 py-2 text-[#e07a4e] hover:bg-[rgba(224,122,78,0.12)] transition-colors"
                >
                  {t("signOut")}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 font-semibold text-[#d8b25c] hover:bg-[rgba(216,178,92,0.12)] transition-colors block"
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
