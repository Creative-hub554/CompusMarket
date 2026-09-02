"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminSearchInput } from "@/components/AdminSearchInput";
import { AdminStatusFilter } from "@/components/AdminStatusFilter";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminDataTable } from "@/components/AdminDataTable";
import { AdminBadge } from "@/components/AdminBadge";

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

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  SELLER: "Seller",
  CONTENT_EDITOR: "Content Editor",
  INVENTORY_MANAGER: "Inventory Manager",
  ADMIN: "Admin",
  BANNED: "Banned",
};

const ROLE_VARIANT: Record<string, "default" | "success" | "danger" | "info"> = {
  CUSTOMER: "default",
  SELLER: "success",
  CONTENT_EDITOR: "default",
  INVENTORY_MANAGER: "default",
  ADMIN: "info",
  BANNED: "danger",
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
    const verb = role === "BANNED" ? "ban" : `change this user's role to ${ROLE_LABELS[role] ?? role}`;
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
      <AdminPageHeader
        title="Users"
        description="Manage accounts, roles, and moderation across the platform."
      />

      <AdminStatusFilter
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        labelMap={{ All: "All", ...ROLE_LABELS }}
      />

      <AdminSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by name or email"
      />

      {loading ? (
        <div className="text-[15px] text-[#86868b]" role="status">Loading users…</div>
      ) : error ? (
        <div className="text-[15px] text-[#d70015]" role="alert">Failed to load users. Admin access required.</div>
      ) : users.length === 0 ? (
        <div className="text-[15px] text-[#86868b]">No users match this filter.</div>
      ) : (
        <AdminDataTable columns={["User", "Role", "Activity", "Joined", "Actions"]}>
          {users.map((u) => {
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
                  <AdminBadge label={ROLE_LABELS[u.role] ?? u.role} variant={ROLE_VARIANT[u.role] ?? "default"} />
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-[#86868b]">
                  {u._count.orders} orders · {u._count.posts} posts
                  {u._count.articles > 0 ? ` · ${u._count.articles} articles` : ""}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-[#86868b]">
                  {new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
                </td>
                <td className="px-6 py-3.5 text-right whitespace-nowrap">
                  {protectedRow ? (
                    <span className="text-[12.5px] text-[#86868b]">Protected</span>
                  ) : (
                    <>
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => setRole(u.id, e.target.value)}
                        aria-label={`Change role for ${u.name || u.email}`}
                        className="mr-2 cursor-pointer rounded-full border-none bg-[#0071e3]/10 px-3.5 py-1.5 text-[13px] font-medium text-[#0071e3] outline-none hover:bg-[#0071e3]/[0.16] disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
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
                          aria-label={`Ban ${u.name || u.email}`}
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
        </AdminDataTable>
      )}
    </div>
  );
}
