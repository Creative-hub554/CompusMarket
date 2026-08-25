"use client";

import { useCallback, useEffect, useState } from "react";

type AdminJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  createdAt: string;
  postedBy: { id: string; name: string | null; email: string } | null;
  _count: { applications: number };
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (q: string, status: string) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/jobs?${params.toString()}`);
      if (!res.ok) throw new Error("Unauthorized");
      setJobs(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query, statusFilter), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, statusFilter, load]);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status } : j))
      );
    }
    setBusyId(null);
  }

  async function removeJob(id: string) {
    if (!window.confirm("Delete this job permanently? Applications go with it.")) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
    if (res.ok) setJobs((prev) => prev.filter((j) => j.id !== id));
    setBusyId(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Jobs moderation</h1>
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, company, location…"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-600">Failed to load jobs. Are you signed in as an admin?</p>
      ) : jobs.length === 0 ? (
        <p className="text-slate-500 py-12 text-center">No jobs match.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="border border-slate-200 rounded-xl p-4 flex items-center gap-4 bg-white"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold truncate">{job.title}</h2>
                  <span
                    className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold ${
                      job.status === "OPEN"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {job.status}
                  </span>
                  <span className="text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {job.type.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5 truncate">
                  {job.company} · {job.location} ·{" "}
                  {job.salaryMin || job.salaryMax
                    ? `$${job.salaryMin?.toLocaleString() ?? 0}–$${job.salaryMax?.toLocaleString() ?? 0} · `
                    : ""}
                  {job._count.applications} applicant
                  {job._count.applications === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  by {job.postedBy?.name || job.postedBy?.email || "unknown"} ·{" "}
                  {timeAgo(job.createdAt)}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => setStatus(job.id, job.status === "OPEN" ? "CLOSED" : "OPEN")}
                  disabled={busyId === job.id}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  {job.status === "OPEN" ? "Close" : "Reopen"}
                </button>
                <button
                  onClick={() => removeJob(job.id)}
                  disabled={busyId === job.id}
                  className="border border-red-200 text-red-600 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
