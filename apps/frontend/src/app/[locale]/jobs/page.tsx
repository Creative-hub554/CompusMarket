"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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

  const hasFilters = q || location || type;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <Link
          href="/jobs/post"
          className="btn-primary"
        >
          {t("postJob")}
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("filterLocation")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-48"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-44"
          >
            <option value="">{t("allTypes")}</option>
            {JOB_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tp.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:underline"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>

      <p className="text-sm text-slate-400 mb-4">
        {loading ? t("loading") : t("resultsCount", { count: total })}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white h-40 animate-pulse"
            />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-white">
          <p className="text-slate-500">{t("noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const salary = salaryLabel(job);
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="card-hover group block rounded-xl border border-slate-200 bg-white p-5 hover:border-indigo-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-indigo-600 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {job.company} · {job.location}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    {job.type.replace("_", " ")}
                  </span>
                </div>
                {salary && (
                  <p className="text-sm font-medium text-slate-900 mt-2">
                    {t("salary")}: {salary}
                  </p>
                )}
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                  {job.description}
                </p>
                {job.postedBy && (
                  <p className="text-xs text-slate-400 mt-3">
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
