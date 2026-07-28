"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed md:static md:translate-x-0 z-50 w-56 bg-khmer-blue text-white p-4 transition-transform duration-200 flex flex-col`}
      >
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin" className="no-underline">
            <div className="font-['Playfair_Display'] text-base font-bold tracking-[0.12em] leading-none text-white">
              KHMERONLINESHOP
            </div>
            <div className="text-[9px] tracking-[0.3em] text-khmer-gold font-medium mt-0.5 text-right">
              admin
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded hover:bg-white/10"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="space-y-1 text-sm flex-1">
          {[
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/products", label: "Products" },
            { href: "/admin/categories", label: "Categories" },
            { href: "/admin/articles", label: "Articles" },
            { href: "/admin/sellers", label: "Sellers" },
            { href: "/admin/orders", label: "Orders" },
            { href: "/admin/warranties", label: "Warranties" },
            { href: "/admin/support", label: "Support" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-white/20 mt-auto">
          <Link href="/" className="block rounded px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs">
            &larr; Back to site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6 min-w-0 bg-gray-50">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden mb-4 p-2 -ml-2 rounded hover:bg-gray-100 bg-white shadow-sm"
          aria-label="Open sidebar"
        >
          <svg className="w-6 h-6 text-khmer-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
