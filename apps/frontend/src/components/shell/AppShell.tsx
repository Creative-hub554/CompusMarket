"use client";

import { useEffect, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { useTranslations } from "next-intl";
import {
  BriefcaseBusiness,
  Compass,
  Home,
  Menu,
  MessageCircle,
  Bookmark,
  Network,
  Search,
  Settings,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/social/NotificationsBell";
import { Avatar } from "@/components/social/Avatar";
import { CreateMenu } from "./CreateMenu";

const primaryItems = [
  { key: "home", href: "/feed", Icon: Home },
  { key: "explore", href: "/community", Icon: Compass },
  { key: "network", href: "/people", Icon: Network },
  { key: "market", href: "/market", Icon: ShoppingBag },
  { key: "jobs", href: "/jobs", Icon: BriefcaseBusiness },
] as const;

const secondaryItems = [
  { key: "saved", href: "/saved", Icon: Bookmark },
  { key: "settings", href: "/account", Icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/feed")
    return pathname === "/feed" || pathname.startsWith("/feed/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status, signOut } = useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!accountOpen) return;
    function closeMenus(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    }
    document.addEventListener("keydown", closeMenus);
    return () => document.removeEventListener("keydown", closeMenus);
  }, [accountOpen]);

  function closeMenus() {
    setAccountOpen(false);
    setMobileOpen(false);
  }

  const profileHref = session?.user ? `/profile/${session.user.id}` : "/login";

  return (
    <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-body)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--surface)]">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <Link
            href="/feed"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight"
            aria-label={t("home")}
          >
            <img src="/champey-mark.svg" alt="" width={32} height={32} />
            <span className="hidden text-lg sm:inline">champey</span>
          </Link>

          <div className="hidden min-w-0 flex-1 lg:block lg:max-w-md">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/search"
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] lg:hidden"
              aria-label={t("globalSearch")}
              title={t("globalSearch")}
            >
              <Search size={20} aria-hidden />
            </Link>

            <CreateMenu />

            <Link
              href="/messages"
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              aria-label={t("messages")}
              title={t("messages")}
            >
              <MessageCircle size={20} aria-hidden />
            </Link>
            <NotificationsBell />
            <div className="hidden sm:block">
              <LocaleSwitcher />
            </div>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="rounded-full p-1 hover:bg-[var(--surface-2)]"
                aria-label={t("profile")}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
              >
                {session?.user ? (
                  <Avatar
                    user={{
                      name: session.user.name,
                      image: (session.user as { image?: string | null }).image,
                    }}
                    size={32}
                  />
                ) : (
                  <UserRound size={22} aria-hidden />
                )}
              </button>
              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-1 shadow-lg"
                >
                  <Link
                    href={profileHref}
                    role="menuitem"
                    onClick={closeMenus}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                  >
                    {t("myProfile")}
                  </Link>
                  <Link
                    href="/account"
                    role="menuitem"
                    onClick={closeMenus}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                  >
                    {t("settings")}
                  </Link>
                  <Link
                    href="/cart"
                    role="menuitem"
                    onClick={closeMenus}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                  >
                    {t("cart")}
                  </Link>
                  {session?.user ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeMenus();
                        signOut();
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                    >
                      {t("signOut")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeMenus();
                        router.push("/login");
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                    >
                      {t("signIn")}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="rounded-lg p-2 hover:bg-[var(--surface-2)] md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={t("toggleMenu")}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X size={22} aria-hidden />
              ) : (
                <Menu size={22} aria-hidden />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-[var(--border-subtle)] px-4 py-3 md:hidden">
            <SearchBar />
            <div className="mt-3 flex gap-2 sm:hidden">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] border-r border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-6 md:flex md:w-[72px] md:flex-col lg:w-[240px]">
          <ShellNav
            items={primaryItems}
            pathname={pathname}
            t={t}
            onClick={closeMenus}
          />
          <div className="my-4 border-t border-[var(--border-subtle)]" />
          <ShellNav
            items={secondaryItems}
            pathname={pathname}
            t={t}
            onClick={closeMenus}
          />
        </aside>
        <main className="min-w-0 pb-20 md:pb-0">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-[var(--border-subtle)] bg-[var(--surface)] md:hidden"
        aria-label={t("mobileNavigation")}
      >
        <MobileNavLink
          href="/feed"
          label={t("home")}
          Icon={Home}
          active={isActive(pathname, "/feed")}
          onClick={closeMenus}
        />
        <MobileNavLink
          href="/community"
          label={t("explore")}
          Icon={Compass}
          active={isActive(pathname, "/community")}
          onClick={closeMenus}
        />
        <CreateMenu mobile />
        <MobileNavLink
          href="/messages"
          label={t("messages")}
          Icon={MessageCircle}
          active={isActive(pathname, "/messages")}
          onClick={closeMenus}
        />
        <MobileNavLink
          href={profileHref}
          label={t("profile")}
          Icon={UserRound}
          active={isActive(pathname, "/profile")}
          onClick={closeMenus}
        />
      </nav>
    </div>
  );
}

function ShellNav({
  items,
  pathname,
  t,
  onClick,
}: {
  items: readonly { key: string; href: string; Icon: typeof Home }[];
  pathname: string;
  t: (key: string) => string;
  onClick: () => void;
}) {
  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      {items.map(({ key, href, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={key}
            href={href}
            onClick={onClick}
            aria-current={active ? "page" : undefined}
            aria-label={t(key)}
            title={t(key)}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
              active
                ? "bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[var(--color-accent)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-body)]"
            } md:justify-center md:px-0 lg:justify-start lg:px-3`}
          >
            <Icon size={20} aria-hidden />
            <span className="md:hidden lg:inline">{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNavLink({
  href,
  label,
  Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  Icon: typeof Home;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-1 text-xs ${active ? "text-[var(--color-accent)]" : "text-[var(--text-muted)]"}`}
    >
      <Icon size={20} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
