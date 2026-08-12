"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { SearchBar } from "./SearchBar";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useCartStore } from "@/stores/cart";
import { Button } from "@theo/ui";

export function Nav() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const cartItems = useCartStore((s) => s.items);
  const initialized = useCartStore((s) => s.initialized);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const sessionCookie = typeof document !== "undefined" && document.cookie.includes("next-auth.session-token");

  useEffect(() => {
    if (!initialized && sessionCookie) {
      fetchCart();
    } else if (!initialized) {
      useCartStore.setState({ initialized: true });
    }
  }, [initialized, sessionCookie, fetchCart]);

  return (
    <nav className="bg-khmer-blue text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 gap-2">
        <Link href="/" className="shrink-0 animate-fade-in no-underline">
          <div className="font-['Playfair_Display'] text-lg sm:text-xl font-bold tracking-[0.15em] leading-none text-white">
            KHMERONLINESHOP
          </div>
          <div className="text-[10px] sm:text-xs tracking-[0.3em] text-khmer-gold font-medium mt-0.5 text-right">
            bytheo
          </div>
        </Link>

        <div className="hidden sm:block flex-1 max-w-xs">
          <SearchBar />
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-4 lg:gap-6 text-sm font-medium items-center">
          <Link href="/" className="nav-link opacity-90 hover:opacity-100">{t("home")}</Link>
          <Link href="/shop" className="nav-link opacity-90 hover:opacity-100">{t("shop")}</Link>
          <Link href="/cart" className="nav-link opacity-90 hover:opacity-100 relative">
            {t("cart")}
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-4 bg-khmer-red text-white text-xs rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
          <Link href="/orders" className="nav-link opacity-90 hover:opacity-100">{t("orders")}</Link>
          <Link href="/warranties" className="nav-link opacity-90 hover:opacity-100">{t("warranties")}</Link>
          <Link href="/community" className="nav-link opacity-90 hover:opacity-100">{t("community")}</Link>
          <Link href="/messages" className="nav-link opacity-90 hover:opacity-100">{t("messages")}</Link>
          <Link href="/support" className="nav-link opacity-90 hover:opacity-100">{t("support")}</Link>
          <Link href="/seller/dashboard" className="nav-link opacity-90 hover:opacity-100">{t("seller")}</Link>
          <div className="relative group">
            <button className="nav-link opacity-90 hover:opacity-100">{t("terms")}</button>
            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl py-1 min-w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-gray-100">
              <Link href="/terms/buyer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-khmer-red hover:text-white transition-colors">{t("buyerTerms")}</Link>
              <Link href="/terms/seller" className="block px-4 py-2 text-sm text-gray-700 hover:bg-khmer-red hover:text-white transition-colors">{t("sellerTerms")}</Link>
            </div>
          </div>
          <LocaleSwitcher />
          {session?.user ? (
            <button onClick={() => signOut()} className="text-sm text-gray-300 hover:text-khmer-gold transition-colors">
              {t("signOut")}
            </button>
          ) : (
            <Button onClick={() => router.push("/login")}>{t("signIn")}</Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 rounded hover:bg-white/10 transition-colors"
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

      {/* Mobile search + nav */}
      {open && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-3 bg-khmer-blue-light animate-slide-down">
          <SearchBar />
          <div className="flex flex-col gap-1 text-sm font-medium">
            <Link href="/" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("home")}</Link>
            <Link href="/shop" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("shop")}</Link>
            <Link href="/cart" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-1">
              {t("cart")}
              {itemCount > 0 && (
                <span className="bg-khmer-red text-white text-xs rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
            <Link href="/orders" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("orders")}</Link>
            <Link href="/warranties" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("warranties")}</Link>
            <Link href="/community" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("community")}</Link>
            <Link href="/messages" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("messages")}</Link>
            <Link href="/support" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("support")}</Link>
            <Link href="/seller/dashboard" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("seller")}</Link>
            <Link href="/terms/buyer" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("buyerTerms")}</Link>
            <Link href="/terms/seller" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">{t("sellerTerms")}</Link>
            <div className="px-3 py-2">
              <LocaleSwitcher />
            </div>
            {session?.user ? (
              <button onClick={() => { signOut(); setOpen(false); }} className="rounded px-3 py-2 text-left text-khmer-gold hover:bg-white/10 transition-colors">
                {t("signOut")}
              </button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded px-3 py-2 font-semibold text-khmer-gold hover:bg-white/10 transition-colors">
                {t("signIn")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
