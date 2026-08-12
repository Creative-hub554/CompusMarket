"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/warranties", label: "Warranties" },
  { href: "/admin/support", label: "Support" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  const nav = (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4 px-4 sm:px-6 h-14">
          <button
            onClick={() => setNavOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100"
            aria-label="Open navigation"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/admin" className="no-underline shrink-0">
            <span className="font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
              KHMER<span className="text-indigo-600">SHOP</span>{" "}
              <span className="text-xs font-semibold text-slate-400">ADMIN</span>
            </span>
          </Link>
          <div className="hidden md:block ml-4 flex-1 min-w-0">{nav}</div>
          <Link
            href="/"
            className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            &larr; Back to site
          </Link>
        </div>
      </header>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold tracking-tight text-slate-900">
                KHMER<span className="text-indigo-600">SHOP</span>
              </span>
              <button
                onClick={() => setNavOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-1" onClick={() => setNavOpen(false)}>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="p-4 sm:p-6 animate-fade-in">{children}</main>
    </div>
  );
}