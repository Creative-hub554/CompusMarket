"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/session-client";
import { toast } from "@/components/ui/toast";
import { jobsApi, type Job, type JobType } from "@/services/jobs";

const JOB_TYPES: JobType[] = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "REMOTE",
];

function salaryLabel(job: Job): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  if (job.salaryMin != null && job.salaryMax != null) {
    return `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`;
  }
  return job.salaryMin != null
    ? `From $${job.salaryMin.toLocaleString()}`
    : `Up to $${job.salaryMax?.toLocaleString()}`;
}

export default function JobsPage() {
  const t = useTranslations("jobs");
  const { data: session } = useSession();

  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(() => {
      setLoading(true);
      jobsApi
        .list({ q, location, type })
        .then((data) => {
          setJobs(data);
          setTotal(data.length);
        })
        .catch(() => {
          setJobs([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [q, location, type]);

  function clearFilters() {
    setQ("");
    setLocation("");
    setType("");
  }

  const alertsLabel = (a: { type: string | null; location: string | null; q: string | null }) =>
    [a.q, a.location, a.type].filter(Boolean).join(" · ") || t("alert");

  const hasFilters = q || location || type;

  // Saved search alerts
  const [alerts, setAlerts] = useState<{ id: string; type: string | null; location: string | null; q: string | null }[]>([]);
  const [alertBusy, setAlertBusy] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/jobs/alerts")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [session?.user]);

  async function saveSearch() {
    setAlertBusy(true);
    const res = await fetch("/api/jobs/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: q.trim() || undefined, location: location.trim() || undefined, type: type || undefined }),
    });
    if (res.ok) {
      const alert = await res.json();
      setAlerts((prev) => [alert, ...prev]);
      toast.success(t("alertSaved"));
    } else {
      toast.error(t("alertFailed"));
    }
    setAlertBusy(false);
  }

  async function removeAlert(alertId: string) {
    const res = await fetch(`/api/jobs/alerts/${alertId}`, { method: "DELETE" });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success(t("alertRemoved"));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("subtitle")}</p>
        </div>
        <Link
          href="/jobs/post"
          className="btn-primary"
        >
          {t("postJob")}
        </Link>
      </div>

      <div
        className="rounded-xl border p-4 mb-6 space-y-4"
        style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="input-field flex-1"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("filterLocation")}
            className="input-field md:w-48"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input-field md:w-44"
          >
            <option value="">{t("allTypes")}</option>
            {JOB_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tp.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {hasFilters ? (
            <button
              onClick={clearFilters}
              className="text-sm font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 transition-colors"
            >
              {t("clearFilters")}
            </button>
          ) : (
            <span />
          )}
          {session?.user && hasFilters && (
            <button
              onClick={saveSearch}
              disabled={alertBusy}
              className="btn-primary !py-1.5 !text-xs inline-flex items-center gap-1.5"
            >
              🔔 {alertBusy ? "…" : t("saveSearch")}
            </button>
          )}
        </div>
        {session?.user && alerts.length > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <p
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              {t("myAlerts")}
            </p>
            <div className="flex flex-wrap gap-2">
              {alerts.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gold-50 dark:bg-gold-950/40 text-gold-700 dark:text-gold-300 text-xs font-medium pl-3 pr-1.5 py-1"
                >
                  🔔 {alertsLabel(a)}
                  <button
                    onClick={() => removeAlert(a.id)}
                    aria-label={t("removeAlert")}
                    className="w-4 h-4 rounded-full hover:bg-gold-200/60 dark:hover:bg-gold-800/60 flex items-center justify-center text-[10px] leading-none"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        {loading ? t("loading") : t("resultsCount", { count: total })}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border h-40 animate-pulse"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
            />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>{t("noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const salary = salaryLabel(job);
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group block rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      className="font-semibold text-lg group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors"
                      style={{ color: "var(--text-body)" }}
                    >
                      {job.title}
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {job.company} · {job.location}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide bg-gold-100 text-gold-700 dark:bg-gold-950/60 dark:text-gold-300 px-2 py-1 rounded-full font-medium">
                    {job.type.replace("_", " ")}
                  </span>
                </div>
                {salary && (
                  <p
                    className="text-sm font-medium mt-2"
                    style={{ color: "var(--text-body)" }}
                  >
                    {t("salary")}: {salary}
                  </p>
                )}
                <p
                  className="text-sm mt-2 line-clamp-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {job.description}
                </p>
                {job.postedBy && (
                  <p className="text-xs mt-3" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                    {t("postedBy", { name: job.postedBy.name || "Unknown" })}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
