"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type LocalizedNavigationProps = {
  className?: string;
};

export function LocalizedNavigation({ className }: LocalizedNavigationProps) {
  const locale = useLocale();
  const t = useTranslations("nav");

  const navItems = [
    { href: "/", label: "home" },
    { href: "/shop", label: "shop" },
    { href: "/cart", label: "cart" },
    { href: "/orders", label: "orders" },
    { href: "/warranties", label: "warranties" },
    { href: "/community", label: "community" },
    { href: "/messages", label: "messages" },
    { href: "/support", label: "support" },
    { href: "/seller", label: "seller" },
  ];

  return (
    <nav className={`flex flex-wrap gap-4 ${className}`}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium hover:text-primary transition-colors"
          style={{ color: "var(--text-body)" }}
        >
          {t(item.label)}
        </Link>
      ))}
    </nav>
  );
}