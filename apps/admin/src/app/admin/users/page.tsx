"use client";

import { useState, useEffect, useCallback } from "react";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  _count: { orders: number; posts: number; articles: number };
};

const ROLES = ["CUSTOMER", "CONTENT_EDITOR", "INVENTORY_MANAGER", "SELLER", "BANNED"] as const;

const FILTERS = ["All", "CUSTOMER", "SELLER", "CONTENT_EDITOR", "INVENTORY_MANAGER", "BANNED"] as const;

const badgeClass: Record<string, string> = {
  CUSTOMER: "bg-black/5 text-[#515154]",
  SELLER: "bg-[#e8f7ee] text-[#248a3d]",
  CONTENT_EDITOR: "bg-black/5 text-[#515154]",
  INVENTORY_MANAGER: "bg-black/5 text-[#515154]",
  ADMIN: "bg-[#f0eaff] text-[#6b4fbb]",
  BANNED: "bg-[#ffeced] text-[#d70015]",
};

const badgeLabel: Record<string, string> = {
  CUSTOMER: "Customer",
  SELLER: "Seller",
  CONTENT_EDITOR: "Content Editor",
  INVENTORY_MANAGER: "Inventory Manager",
  ADMIN: "Admin",
  BANNED: "Banned",
};

function initials(u: AdminUser) {
  const src = (u.name || u.email).trim();
  const parts = src.split(/\s+/);
  const chars = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2);
  return chars.toUpperCase();
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (q: string, role: string) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role !== "All") params.set("role", role);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Unauthorized");
      setUsers(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query, filter), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, filter, load]);

  async function setRole(id: string, role: string) {
    const verb = role === "BANNED" ? "ban" : `change this user's role to ${badgeLabel[role] ?? role}`;
    if (!confirm(`Are you sure you want to ${verb}?`)) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to update user");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[980px]">
      <h1 className="text-[40px] font-bold leading-tight tracking-tight text-[#1d1d1f]">
        Users
      </h1>
      <p className="mb-8 mt-2 text-[17px] text-[#6e6e73]">
        Manage accounts, roles, and moderation across the platform.
      </p>

      <div className="mb-6 inline-flex rounded-lg bg-black/5 p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-shadow ${
              filter === f
                ? "bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                : "text-[#1d1d1f] hover:bg-white/50"
            }`}
          >
            {f === "All" ? "All" : badgeLabel[f]}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-2 rounded-[10px] bg-black/[0.04] px-3.5 py-2.5">
        <svg className="h-4 w-4 text-[#86868b]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx={11} cy={11} r={7} />
          <path strokeLinecap="round" d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="w-full bg-transparent text-[15px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
        />
      </div>

      {loading ? (
        <div className="text-[15px] text-[#86868b]">Loading users…</div>
      ) : error ? (
        <div className="text-[15px] text-[#d70015]">Failed to load users. Admin access required.</div>
      ) : users.length === 0 ? (
        <div className="text-[15px] text-[#86868b]">No users match this filter.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-black/5 text-left text-[12px] font-semibold text-[#6e6e73]">
                <th className="px-6 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Activity</th>
                <th className="px-4 py-3.5">Joined</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = false;
                const protectedRow = u.role === "ADMIN";
                const banned = u.role === "BANNED";
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-black/5 transition-colors last:border-b-0 hover:bg-[#fafafa] ${
                      banned ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3.5">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-[12px] font-bold text-[#6e6e73]">
                            {initials(u)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className={`text-[14.5px] font-semibold tracking-tight ${banned ? "text-[#86868b] line-through" : "text-[#1d1d1f]"}`}>
                            {u.name || u.email}
                          </div>
                          <div className="truncate text-[12.5px] text-[#86868b]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${badgeClass[u.role] ?? badgeClass.CUSTOMER}`}>
                        {badgeLabel[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-[#86868b]">
                      {u._count.orders} orders · {u._count.posts} posts
                      {u._count.articles > 0 ? ` · ${u._count.articles} articles` : ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-[#86868b]">
                      {new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {protectedRow || isSelf ? (
                        <span className="text-[12.5px] text-[#86868b]">Protected</span>
                      ) : (
                        <>
                          <select
                            value={u.role}
                            disabled={busyId === u.id}
                            onChange={(e) => setRole(u.id, e.target.value)}
                            className="mr-2 cursor-pointer rounded-full border-none bg-[#0071e3]/10 px-3.5 py-1.5 text-[13px] font-medium text-[#0071e3] outline-none hover:bg-[#0071e3]/[0.16] disabled:opacity-50"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {badgeLabel[r]}
                              </option>
                            ))}
                            <option value="ADMIN" disabled>
                              Admin (protected)
                            </option>
                          </select>
                          {banned ? (
                            <button
                              onClick={() => setRole(u.id, "CUSTOMER")}
                              disabled={busyId === u.id}
                              className="rounded-full bg-[#0071e3]/10 px-4 py-1.5 text-[13px] font-medium text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.16] disabled:opacity-50"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => setRole(u.id, "BANNED")}
                              disabled={busyId === u.id}
                              className="rounded-full bg-[#ff3b30]/[0.08] px-4 py-1.5 text-[13px] font-medium text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/[0.15] disabled:opacity-50"
                            >
                              Ban
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
