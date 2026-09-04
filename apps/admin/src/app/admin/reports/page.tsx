"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
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

type ResolutionEntry = {
  id: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  notes: string | null;
  createdAt: string;
  resolvedBy: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
};

type ActivityEntry = ResolutionEntry & {
  report: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    status: string;
    reporter: { id: string; name: string | null; email: string };
  };
};

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  ABUSE: "Abuse",
  FRAUD: "Fraud",
  INAPPROPRIATE: "Inappropriate",
  OTHER: "Other",
};

const STATUS_VARIANT: Record<string, "warning" | "success" | "danger" | "default"> = {
  PENDING: "warning",
  REVIEWED: "success",
  REMOVED: "danger",
  DISMISSED: "default",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  REMOVED: "Removed",
  DISMISSED: "Dismissed",
};

const FILTER_OPTIONS = [
  "",
  "PENDING",
  "REVIEWED",
  "REMOVED",
  "DISMISSED",
] as const;

const FILTER_LABELS: Record<string, string> = {
  "": "All",
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  REMOVED: "Removed",
  DISMISSED: "Dismissed",
};

const ACTION_VARIANT: Record<string, "success" | "danger" | "default"> = {
  APPROVED: "success",
  DISMISSED: "default",
  CONTENT_REMOVED: "danger",
};

const ACTION_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  DISMISSED: "Dismissed",
  CONTENT_REMOVED: "Content removed",
};

const ACTION_VERBS: Record<string, string> = {
  APPROVED: "approved",
  DISMISSED: "dismissed",
  CONTENT_REMOVED: "removed the content of",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function nameOf(u: { name: string | null; email: string } | null | undefined) {
  return u?.name || u?.email || "Unknown";
}

function initialsOf(u: { name: string | null; email: string } | null | undefined) {
  const src = (u?.name || u?.email || "?").trim();
  const parts = src.split(/\s+/);
  const chars = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2);
  return chars.toUpperCase();
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<StatusCounts>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<ResolutionEntry[] | null>(null);
  const [historyError, setHistoryError] = useState(false);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    setListError(false);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setReports(data.reports);
      setCounts(data.counts);
    } catch {
      setListError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await fetch("/api/admin/reports/activity?limit=10");
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setActivity(Array.isArray(data) ? data : []);
    } catch {
      /* empty */
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  async function resolveReport(r: Report, action: "APPROVED" | "DISMISSED" | "CONTENT_REMOVED") {
    if (action === "CONTENT_REMOVED") {
      const verb =
        r.targetType === "PRODUCT"
          ? "hide the product from the store"
          : "delete the reported content permanently";
      const ok = confirm(
        `Remove content? This will ${verb} and close every pending report on it.`,
      );
      if (!ok) return;
    }
    setActionId(r.id);
    try {
      const res = await fetch(`/api/admin/reports/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to resolve report");
        return;
      }
      await Promise.all([load(filter), loadActivity()]);
    } catch {
      alert("Failed to resolve report");
    } finally {
      setActionId(null);
    }
  }

  async function toggleHistory(r: Report) {
    if (historyFor === r.id) {
      setHistoryFor(null);
      setHistory(null);
      setHistoryError(false);
      return;
    }
    setHistoryFor(r.id);
    setHistory(null);
    setHistoryError(false);
    try {
      const res = await fetch(`/api/admin/reports/${r.id}/history`);
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistoryError(true);
    }
  }

  const pendingCount = counts.find((c) => c.status === "PENDING")?._count ?? 0;

  return (
    <div className="mx-auto max-w-[1180px]">
      <AdminPageHeader
        title="Reports"
        description={`${pendingCount} pending report${pendingCount !== 1 ? "s" : ""}`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
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
          ) : listError ? (
            <div className="text-center py-12 text-[15px] text-[#d70015]">
              Failed to load reports. Admin access required.
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
                    <Fragment key={r.id}>
                      <tr className="border-b border-black/5 transition-colors hover:bg-[#fafafa]">
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
                          <AdminBadge label={STATUS_LABELS[r.status] ?? r.status} variant={STATUS_VARIANT[r.status] ?? "default"} />
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-1">
                            {r.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => resolveReport(r, "APPROVED")}
                                  disabled={actionId === r.id}
                                  title="Close the report without removing the content"
                                  className="text-xs px-2 py-1 bg-[#e8f7ee] text-[#248a3d] rounded hover:bg-[#d4f1de] disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => resolveReport(r, "DISMISSED")}
                                  disabled={actionId === r.id}
                                  title="Reject the report as unfounded"
                                  className="text-xs px-2 py-1 bg-black/5 text-[#515154] rounded hover:bg-black/10 disabled:opacity-50"
                                >
                                  Dismiss
                                </button>
                                {r.targetType !== "USER" && (
                                  <button
                                    onClick={() => resolveReport(r, "CONTENT_REMOVED")}
                                    disabled={actionId === r.id}
                                    title={
                                      r.targetType === "PRODUCT"
                                        ? "Hide the product and close all pending reports on it"
                                        : "Delete the content and close all pending reports on it"
                                    }
                                    className="text-xs px-2 py-1 bg-[#ffeced] text-[#d70015] rounded hover:bg-[#ffd9d5] disabled:opacity-50"
                                  >
                                    Remove
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={() => toggleHistory(r)}
                              disabled={actionId === r.id}
                              title="Show the audit trail for this report"
                              className="text-xs px-2 py-1 text-[#0071e3] rounded hover:bg-[#0071e3]/10 disabled:opacity-50"
                            >
                              {historyFor === r.id ? "Hide history" : "History"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {historyFor === r.id && (
                        <tr key={`${r.id}-history`} className="border-b border-black/5 bg-[#fafafa] last:border-b-0">
                          <td colSpan={7} className="px-6 py-4">
                            {historyError ? (
                              <p className="text-xs text-[#d70015]">Failed to load history.</p>
                            ) : history === null ? (
                              <p className="text-xs text-[#86868b] animate-pulse">Loading history…</p>
                            ) : history.length === 0 ? (
                              <p className="text-xs text-[#86868b]">
                                No resolution actions recorded for this report yet.
                              </p>
                            ) : (
                              <ol className="space-y-2">
                                {history.map((e) => (
                                  <li key={e.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]">
                                    <AdminBadge
                                      label={ACTION_LABELS[e.action] ?? e.action}
                                      variant={ACTION_VARIANT[e.action] ?? "default"}
                                    />
                                    <span className="text-[#1d1d1f]">
                                      {STATUS_LABELS[e.fromStatus] ?? e.fromStatus}
                                      <span className="text-[#86868b]"> → </span>
                                      {STATUS_LABELS[e.toStatus] ?? e.toStatus}
                                    </span>
                                    <span className="text-[#86868b]">
                                      by {nameOf(e.resolvedBy)}
                                    </span>
                                    <span className="text-[#86868b]">
                                      · {new Date(e.createdAt).toLocaleString()}
                                    </span>
                                    {e.notes && (
                                      <span className="italic text-[#515154]">&ldquo;{e.notes}&rdquo;</span>
                                    )}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="min-w-0">
          <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Recent activity</h2>
            <p className="mt-0.5 text-[12.5px] text-[#86868b]">
              Latest report resolutions by admins
            </p>
            {activityLoading && activity.length === 0 ? (
              <p className="mt-4 text-[13px] text-[#86868b] animate-pulse">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="mt-4 text-[13px] text-[#86868b]">No report activity yet.</p>
            ) : (
              <ul className="mt-2 -my-1 divide-y divide-black/5 max-h-[38rem] overflow-y-auto">
                {activity.map((e) => {
                  return (
                    <li key={e.id} className="flex items-start gap-2.5 py-2.5">
                      {e.resolvedBy?.image ? (
                        <img src={e.resolvedBy.image} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/5 text-[10px] font-bold text-[#6e6e73]">
                          {initialsOf(e.resolvedBy)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1 text-[12.5px] leading-snug">
                        <p className="text-[#1d1d1f]">
                          <span className="font-semibold">{nameOf(e.resolvedBy)}</span>{" "}
                          <span className="text-[#515154]">
                            {ACTION_VERBS[e.action] ?? "resolved"} a {REASON_LABELS[e.report.reason]?.toLowerCase() ?? e.report.reason.toLowerCase()} report on {e.report.targetType.toLowerCase()}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[#86868b]">
                          reported by {nameOf(e.report.reporter)} · {timeAgo(e.createdAt)}
                        </p>
                        {e.notes && (
                          <p className="mt-0.5 italic text-[#515154] truncate" title={e.notes}>
                            &ldquo;{e.notes}&rdquo;
                          </p>
                        )}
                      </div>
                      <AdminBadge
                        label={ACTION_LABELS[e.action] ?? e.action}
                        variant={ACTION_VARIANT[e.action] ?? "default"}
                      />
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
