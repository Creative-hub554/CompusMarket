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
  banReason: string | null;
  createdAt: string;
};

type RoleChange = {
  id: string;
  fromRole: string;
  toRole: string;
  reason: string | null;
  createdAt: string;
  changedBy: { id: string; name: string | null; email: string; image: string | null } | null;
  target?: { id: string; name: string | null; email: string; image: string | null } | null;
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
  const [banDraft, setBanDraft] = useState<{ user: AdminUser; reason: string } | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<RoleChange[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [recent, setRecent] = useState<RoleChange[] | null>(null);
  const [recentError, setRecentError] = useState("");

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

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/users/changes?limit=10");
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || body.message || t("error"));
        if (!cancelled) setRecent(Array.isArray(body) ? body : []);
      } catch (e) {
        if (!cancelled) setRecentError(e instanceof Error ? e.message : t("error"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, t]);

  function mergeUser(u: AdminUser, patch: Partial<AdminUser>) {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...patch } : x)));
  }

  async function applyRole(u: AdminUser, role: string, reason?: string) {
    setBusy(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || body.message || t("error"));
      mergeUser(u, {
        role: body.role ?? role,
        banReason: body.banReason ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  function onRoleSelect(u: AdminUser, role: string) {
    if (role === u.role) return;
    if (role === "BANNED") {
      setBanDraft({ user: u, reason: "" });
      return;
    }
    applyRole(u, role);
  }

  function confirmBan() {
    if (!banDraft) return;
    const { user, reason } = banDraft;
    setBanDraft(null);
    applyRole(user, "BANNED", reason.trim() || undefined);
  }

  async function toggleHistory(u: AdminUser) {
    if (historyFor === u.id) {
      setHistoryFor(null);
      setHistory(null);
      setHistoryError("");
      return;
    }
    setHistoryFor(u.id);
    setHistory(null);
    setHistoryError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}/changes`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || body.message || t("error"));
      setHistory(Array.isArray(body) ? body : []);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : t("error"));
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(draft.trim());
  }

  function roleLabel(r: string) {
    return t(`role_${r}`) || r;
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
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
                const editingBan = banDraft?.user.id === u.id;
                return [
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={{ name: u.name, image: u.image }} size={32} />
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
                      <div className="flex flex-col items-start gap-1">
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
                        {u.role === "BANNED" && (
                          <span
                            className="text-xs italic text-red-600/80 dark:text-red-400/80 max-w-[16rem] truncate"
                            title={u.banReason ?? undefined}
                          >
                            {u.banReason ? `“${u.banReason}”` : t("noReason")}
                          </span>
                        )}
                      </div>
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
                      ) : editingBan ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={banDraft?.reason ?? ""}
                            onChange={(e) =>
                              setBanDraft((d) => (d ? { ...d, reason: e.target.value } : d))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmBan();
                              if (e.key === "Escape") setBanDraft(null);
                            }}
                            placeholder={t("reasonPlaceholder")}
                            aria-label={t("reasonLabel")}
                            maxLength={500}
                            className="rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={confirmBan}
                              disabled={busy === u.id}
                              className="rounded-lg bg-red-600 text-white px-2.5 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                            >
                              {t("confirmBan")}
                            </button>
                            <button
                              onClick={() => setBanDraft(null)}
                              className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs disabled:opacity-50"
                            >
                              {t("cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              disabled={busy === u.id}
                              onChange={(e) => onRoleSelect(u, e.target.value)}
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
                          <button
                            type="button"
                            onClick={() => toggleHistory(u)}
                            className="text-xs text-gold-600 dark:text-gold-light hover:underline"
                          >
                            {historyFor === u.id ? `${t("history")} ▴` : `${t("history")} ▾`}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>,
                  ...(historyFor === u.id
                    ? [
                        <tr
                          key={`${u.id}-history`}
                          className="border-b border-slate-100 dark:border-slate-800 last:border-0 bg-slate-50/70 dark:bg-slate-900/50"
                        >
                          <td colSpan={5} className="px-6 py-3">
                            {historyError ? (
                              <p className="text-xs text-red-600 dark:text-red-400">{historyError}</p>
                            ) : history === null ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                                {t("loadingHistory")}
                              </p>
                            ) : history.length === 0 ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t("historyEmpty")}
                              </p>
                            ) : (
                              <ol className="space-y-2">
                                {history.map((e) => {
                                  const actorIsSelf = e.changedBy?.id === session?.user?.id;
                                  const actor = actorIsSelf
                                    ? t("you")
                                    : e.changedBy?.name || e.changedBy?.email || t("systemActor");
                                  return (
                                    <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                      <span className="inline-block rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 font-medium">
                                        {t(`role_${e.fromRole}`) || e.fromRole}
                                      </span>
                                      <span className="text-slate-400">→</span>
                                      <span className="inline-block rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 font-medium">
                                        {t(`role_${e.toRole}`) || e.toRole}
                                      </span>
                                      {e.reason && (
                                        <span className="italic text-slate-600 dark:text-slate-300">
                                          “{e.reason}”
                                        </span>
                                      )}
                                      <span className="text-slate-400">
                                        · {t("byActor", { name: actor })}
                                      </span>
                                      <span className="text-slate-400">
                                        · {new Date(e.createdAt).toLocaleString()}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ol>
                            )}
                          </td>
                        </tr>,
                      ]
                    : []),
                ];
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

        <aside className="min-w-0">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h2 className="text-sm font-bold mb-3">{t("recentChanges")}</h2>
            {recentError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{recentError}</p>
            ) : recent === null ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                {t("loadingHistory")}
              </p>
            ) : recent.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("historyEmpty")}</p>
            ) : (
              <ul className="-my-1 divide-y divide-slate-100 dark:divide-slate-800 max-h-[26rem] overflow-y-auto">
                {recent.map((e) => {
                  const actorIsSelf = e.changedBy?.id === session?.user?.id;
                  const actor = actorIsSelf
                    ? t("you")
                    : e.changedBy?.name || e.changedBy?.email || t("systemActor");
                  const targetName = e.target?.name || e.target?.email || "—";
                  return (
                    <li key={e.id} className="py-2 flex gap-2.5">
                      <Avatar
                        user={{
                          name: e.target?.name ?? undefined,
                          image: e.target?.image ?? undefined,
                        }}
                        size={30}
                      />
                      <div className="min-w-0 flex-1 text-xs leading-snug">
                        <p className="truncate font-medium text-slate-700 dark:text-slate-200">
                          {targetName}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className="inline-block rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 font-medium">
                            {roleLabel(e.fromRole)}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="inline-block rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 font-medium">
                            {roleLabel(e.toRole)}
                          </span>
                        </p>
                        {e.reason && (
                          <p
                            className="mt-0.5 italic text-slate-600 dark:text-slate-400 truncate"
                            title={e.reason}
                          >
                            “{e.reason}”
                          </p>
                        )}
                        <p className="mt-0.5 text-slate-400">
                          {t("byActor", { name: actor })} · {new Date(e.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
