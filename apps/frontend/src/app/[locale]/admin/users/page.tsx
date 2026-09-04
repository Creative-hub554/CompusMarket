"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { Avatar } from "@/components/social/Avatar";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: string;
  clerkId: string | null;
  accountPrivate: boolean;
  emailVerified: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;
const ROLE_OPTIONS = ["CUSTOMER", "SELLER", "INVENTORY_MANAGER", "ADMIN", "BANNED"] as const;

export default function AdminUsersPage() {
  const t = useTranslations("admin");
  const tnav = useTranslations("nav");
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (query: string, p: number) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        params.set("page", String(p));
        params.set("limit", String(PAGE_SIZE));
        const res = await fetch(`/api/admin/users?${params}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || body.message || t("error"));
        setUsers(body.items ?? []);
        setTotal(body.total ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("error"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    load(q, page);
  }, [isAdmin, q, page, load]);

  async function changeRole(u: AdminUser, role: string) {
    if (role === u.role) return;
    setBusy(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || body.message || t("error"));
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(draft.trim());
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-3">{t("notAdmin")}</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-4">{t("notAdminText")}</p>
        <Link href="/" className="text-gold-600 font-medium hover:underline">
          ← {tnav("home")}
        </Link>
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{t("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
      </div>

      <form onSubmit={submitSearch} className="mb-5 flex gap-2">
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          className="flex-1 max-w-md rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
        <button
          type="submit"
          className="rounded-lg bg-gold text-slate-900 px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          {t("search")}
        </button>
      </form>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t("totalUsers", { count: total })}</p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-slate-500 dark:text-slate-400">{t("loading")}</p>
      ) : users.length === 0 ? (
        <p className="py-10 text-center text-slate-500 dark:text-slate-400">{t("noResults")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-semibold">{t("user")}</th>
                <th className="px-4 py-3 font-semibold">{t("role")}</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">{t("joined")}</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Clerk</th>
                <th className="px-4 py-3 font-semibold">{t("changeRole")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = session?.user?.id === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          user={{ name: u.name, image: u.image }}
                          size={32}
                        />
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {u.name || u.username || u.email}
                            {isSelf && (
                              <span className="ml-2 text-xs text-slate-400">({t("selfGuard")})</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.role === "BANNED"
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : u.role === "ADMIN"
                              ? "bg-gold/20 text-gold-700 dark:text-gold-light"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {t(`role_${u.role}`) || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className={`text-xs ${u.clerkId ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                      >
                        {u.clerkId ? t("linked") : t("notLinked")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="text-xs text-slate-400">{t("selfGuard")}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            disabled={busy === u.id}
                            onChange={(e) => changeRole(u, e.target.value)}
                            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {t(`role_${r}`) || r}
                              </option>
                            ))}
                          </select>
                          {busy === u.id && (
                            <span className="text-xs text-slate-400 animate-pulse">…</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm disabled:opacity-40 hover:enabled:bg-slate-100 dark:hover:enabled:bg-slate-800"
          >
            {t("prev")}
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t("pageOf", { page, pages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm disabled:opacity-40 hover:enabled:bg-slate-100 dark:hover:enabled:bg-slate-800"
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}