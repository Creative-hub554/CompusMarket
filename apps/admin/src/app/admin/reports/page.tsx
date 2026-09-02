"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminStatusFilter } from "@/components/AdminStatusFilter";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminBadge } from "@/components/AdminBadge";

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  message: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  reporter: { id: string; name: string | null; email: string };
};

type StatusCounts = { status: string; _count: number }[];

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  ABUSE: "Abuse",
  FRAUD: "Fraud",
  INAPPROPRIATE: "Inappropriate",
  OTHER: "Other",
};

const STATUS_VARIANT: Record<string, "warning" | "success" | "default"> = {
  PENDING: "warning",
  REVIEWED: "success",
  DISMISSED: "default",
};

const FILTER_OPTIONS = ["", "PENDING", "REVIEWED", "DISMISSED"] as const;

const FILTER_LABELS: Record<string, string> = {
  "": "All",
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  DISMISSED: "Dismissed",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<StatusCounts>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setReports(data.reports);
      setCounts(data.counts);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function updateStatus(id: string, status: string, notes?: string) {
    setActionId(id);
    try {
      await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes }),
      });
      setReports((prev) => prev.filter((r) => r.id !== id));
      setCounts((prev) =>
        prev.map((c) =>
          c.status === "PENDING" ? { ...c, _count: c._count - 1 } : c,
        ),
      );
    } catch {
      /* empty */
    } finally {
      setActionId(null);
    }
  }

  const pendingCount = counts.find((c) => c.status === "PENDING")?._count ?? 0;

  return (
    <div className="mx-auto max-w-[980px]">
      <AdminPageHeader
        title="Reports"
        description={`${pendingCount} pending report${pendingCount !== 1 ? "s" : ""}`}
      />

      <AdminStatusFilter
        options={FILTER_OPTIONS}
        value={filter}
        onChange={setFilter}
        labelMap={FILTER_LABELS}
      />

      {loading ? (
        <div className="text-center py-12 text-[15px] text-[#86868b]" role="status">
          Loading…
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-[15px] text-[#86868b]">
          No reports found
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <table className="w-full text-[14px]" role="table">
            <thead>
              <tr className="border-b border-black/5 text-left text-[12px] font-semibold text-[#6e6e73]">
                <th className="px-6 py-3.5" scope="col">Type</th>
                <th className="px-4 py-3.5" scope="col">Target</th>
                <th className="px-4 py-3.5" scope="col">Reason</th>
                <th className="px-4 py-3.5" scope="col">Reporter</th>
                <th className="px-4 py-3.5" scope="col">When</th>
                <th className="px-4 py-3.5" scope="col">Status</th>
                <th className="px-6 py-3.5" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-black/5 transition-colors last:border-b-0 hover:bg-[#fafafa]">
                  <td className="px-6 py-3.5 font-medium">{r.targetType}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#86868b] max-w-[120px] truncate">
                    {r.targetId}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium">{REASON_LABELS[r.reason] ?? r.reason}</span>
                    {r.message && (
                      <p className="text-xs text-[#86868b] mt-0.5 max-w-[200px] truncate">
                        &ldquo;{r.message}&rdquo;
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    {r.reporter.name || r.reporter.email}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#86868b]">
                    {timeAgo(r.createdAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <AdminBadge label={r.status} variant={STATUS_VARIANT[r.status] ?? "default"} />
                  </td>
                  <td className="px-6 py-3.5">
                    {r.status === "PENDING" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateStatus(r.id, "REVIEWED")}
                          disabled={actionId === r.id}
                          className="text-xs px-2 py-1 bg-[#e8f7ee] text-[#248a3d] rounded hover:bg-[#d4f1de] disabled:opacity-50"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, "DISMISSED")}
                          disabled={actionId === r.id}
                          className="text-xs px-2 py-1 bg-black/5 text-[#515154] rounded hover:bg-black/10 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
