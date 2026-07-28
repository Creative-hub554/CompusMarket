"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { SearchBar } from "./SearchBar";
import { useCartStore } from "@/stores/cart";

export function Nav() {
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
          <Link href="/" className="nav-link opacity-90 hover:opacity-100">Home</Link>
          <Link href="/shop" className="nav-link opacity-90 hover:opacity-100">Shop</Link>
          <Link href="/cart" className="nav-link opacity-90 hover:opacity-100 relative">
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-4 bg-khmer-red text-white text-xs rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
          <Link href="/orders" className="nav-link opacity-90 hover:opacity-100">Orders</Link>
          <Link href="/warranties" className="nav-link opacity-90 hover:opacity-100">Warranties</Link>
          <div className="relative group">
            <Link href="/community" className="nav-link opacity-90 hover:opacity-100">Community</Link>
            <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-xl py-1 min-w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-gray-100">
              <Link href="/community/resume" className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors">Resume Builder</Link>
              <Link href="/community/careers" className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors">Career Resources</Link>
              <hr className="my-1 border-gray-100" />
              <Link href="/community/documents" className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors">Documents</Link>
              <Link href="/community/diagrams" className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors">Diagrams</Link>
              <Link href="/community/flashcards" className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors">Flashcards</Link>
              <Link href="/community/quizzes" className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors">Quizzes</Link>
              <Link href="/community/notes" className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors">Study Notes</Link>
              <Link href="/community/design" className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors">Design Assets</Link>
            </div>
          </div>
          <Link href="/messages" className="nav-link opacity-90 hover:opacity-100">Messages</Link>
          <Link href="/support" className="nav-link opacity-90 hover:opacity-100">Support</Link>
          <Link href="/seller/dashboard" className="nav-link opacity-90 hover:opacity-100">Seller</Link>
          <div className="relative group">
            <button className="nav-link opacity-90 hover:opacity-100">Terms</button>
            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl py-1 min-w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-gray-100">
              <Link href="/terms/buyer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-khmer-red hover:text-white transition-colors">Buyer Terms</Link>
              <Link href="/terms/seller" className="block px-4 py-2 text-sm text-gray-700 hover:bg-khmer-red hover:text-white transition-colors">Seller Terms</Link>
            </div>
          </div>
          {session?.user ? (
            <button onClick={() => signOut()} className="text-sm text-gray-300 hover:text-khmer-gold transition-colors">
              Sign Out
            </button>
          ) : (
            <Link href="/login" className="rounded bg-khmer-gold text-khmer-blue px-3 py-1.5 text-sm font-semibold hover:bg-yellow-500 transition-colors animate-pulse-glow">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 rounded hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
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
            <Link href="/" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Home</Link>
            <Link href="/shop" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Shop</Link>
            <Link href="/cart" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-1">
              Cart
              {itemCount > 0 && (
                <span className="bg-khmer-red text-white text-xs rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
            <Link href="/orders" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Orders</Link>
            <Link href="/warranties" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Warranties</Link>
            <Link href="/community" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Community</Link>
            <Link href="/community/documents" onClick={() => setOpen(false)} className="rounded px-3 py-2 pl-6 hover:bg-white/10 transition-colors text-sm">Documents</Link>
            <Link href="/community/diagrams" onClick={() => setOpen(false)} className="rounded px-3 py-2 pl-6 hover:bg-white/10 transition-colors text-sm">Diagrams</Link>
            <Link href="/community/flashcards" onClick={() => setOpen(false)} className="rounded px-3 py-2 pl-6 hover:bg-white/10 transition-colors text-sm">Flashcards</Link>
            <Link href="/community/quizzes" onClick={() => setOpen(false)} className="rounded px-3 py-2 pl-6 hover:bg-white/10 transition-colors text-sm">Quizzes</Link>
            <Link href="/community/notes" onClick={() => setOpen(false)} className="rounded px-3 py-2 pl-6 hover:bg-white/10 transition-colors text-sm">Study Notes</Link>
            <Link href="/community/design" onClick={() => setOpen(false)} className="rounded px-3 py-2 pl-6 hover:bg-white/10 transition-colors text-sm">Design Assets</Link>
            <Link href="/messages" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Messages</Link>
            <Link href="/support" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Support</Link>
            <Link href="/seller/dashboard" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Seller</Link>
            <Link href="/terms/buyer" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Buyer Terms</Link>
            <Link href="/terms/seller" onClick={() => setOpen(false)} className="rounded px-3 py-2 hover:bg-white/10 transition-colors">Seller Terms</Link>
            {session?.user ? (
              <button onClick={() => { signOut(); setOpen(false); }} className="rounded px-3 py-2 text-left text-khmer-gold hover:bg-white/10 transition-colors">
                Sign Out
              </button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded px-3 py-2 font-semibold text-khmer-gold hover:bg-white/10 transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
