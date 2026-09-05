"use client";

import { Link, usePathname } from "@/i18n/navigation";

export type SidebarItem = { href: string; label: string };
export type SidebarGroup = { label?: string; items: SidebarItem[] };

export function SectionSidebar({
  title,
  groups,
}: {
  title: string;
  groups: SidebarGroup[];
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
        <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </p>
        <nav>
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-70">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-[rgba(255,107,94,0.14)] font-semibold text-gold"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-body)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
