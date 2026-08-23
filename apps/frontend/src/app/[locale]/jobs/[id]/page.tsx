"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  jobsApi,
  type Job,
  type JobApplication,
  type ApplicationStatus,
} from "@/services/jobs";

function salaryText(job: Job): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  if (job.salaryMin != null && job.salaryMax != null) {
    return `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`;
  }
  return job.salaryMin != null
    ? `From $${job.salaryMin.toLocaleString()}`
    : `Up to $${job.salaryMax?.toLocaleString()}`;
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

export default function JobDetailPage() {
  const t = useTranslations("jobs");
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicants, setApplicants] = useState<JobApplication[] | null>(null);

  useEffect(() => {
    if (!id) return;
    jobsApi
      .byId(id)
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = !!session?.user?.id && !!job && session.user.id === job.postedById;

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      await jobsApi.apply(id, { coverLetter });
      setApplied(true);
      setCoverLetter("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("applyTitle"));
    } finally {
      setSubmitting(false);
    }
  }

  async function loadApplicants() {
    if (!id) return;
    try {
      setApplicants(await jobsApi.applicants(id));
    } catch {
      setApplicants([]);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-slate-400">{t("loading")}</div>;
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-slate-500">{t("noResults")}</p>
        <Link href="/jobs" className="text-indigo-600 hover:underline">
          {t("backToJobs")}
        </Link>
      </div>
    );
  }

  const salary = salaryText(job);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
      <Link href="/jobs" className="text-sm text-indigo-600 hover:underline">
        ← {t("backToJobs")}
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="text-slate-600 mt-1">
              {job.company} · {job.location}
            </p>
          </div>
          <span className="shrink-0 text-xs uppercase tracking-wide bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
            {job.type.replace("_", " ")}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div>
            <dt className="text-slate-400">{t("status")}</dt>
            <dd className="font-medium">
              {job.status === "OPEN" ? t("open") : t("closed")}
            </dd>
          </div>
          {salary && (
            <div>
              <dt className="text-slate-400">{t("salary")}</dt>
              <dd className="font-medium">{salary}</dd>
            </div>
          )}
        </dl>

        <div className="mt-5">
          <h2 className="font-semibold mb-1">{t("descriptionLabel")}</h2>
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
            {job.description}
          </p>
        </div>

        {job.postedBy && (
          <p className="text-xs text-slate-400 mt-4">
            {t("postedBy", { name: job.postedBy.name || "Unknown" })}
          </p>
        )}
      </div>

      {/* Owner view */}
      {isOwner && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <p className="font-medium">{t("youPostedThis")}</p>
            <button onClick={loadApplicants} className="btn-primary">
              {t("viewApplicants")}
            </button>
          </div>
          {applicants && (
            <div className="mt-4 space-y-3">
              <h3 className="font-semibold">
                {t("applicants")} ({applicants.length})
              </h3>
              {applicants.length === 0 ? (
                <p className="text-sm text-slate-500">{t("noApplications")}</p>
              ) : (
                applicants.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {app.applicant?.name || "Applicant"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {STATUS_LABELS[app.status]}
                      </span>
                    </div>
                    {app.coverLetter && (
                      <p className="text-sm text-slate-700 mt-1">
                        {app.coverLetter}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Applicant view */}
      {!isOwner && session?.user && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          {applied ? (
            <p className="text-green-600 font-medium">{t("applicationSubmitted")}</p>
          ) : (
            <form onSubmit={submitApplication} className="space-y-3">
              <h3 className="font-semibold">{t("applyTitle")}</h3>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={5}
                placeholder={t("coverLetterPlaceholder")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? t("submitting") : t("submitApplication")}
              </button>
            </form>
          )}
        </div>
      )}

      {!isOwner && !session?.user && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-500 mb-3">{t("loginToApply")}</p>
          <Link href="/login" className="btn-primary">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
