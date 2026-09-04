"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { useTranslations } from "next-intl";
import { jobsApi, type JobApplication, type ApplicationStatus } from "@/services/jobs";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

export default function MyApplicationsPage() {
  const t = useTranslations("jobs");
  const { data: session } = useSession();

  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    jobsApi
      .myApplications()
      .then(setApps)
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-slate-500 dark:text-slate-400">{t("loginToApply")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
      <h1 className="page-title mb-6">{t("myApplications")}</h1>

      {loading ? (
        <p className="text-slate-400">{t("loading")}</p>
      ) : apps.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-[var(--surface)]">
          <p className="text-slate-500 dark:text-slate-400">{t("noApplications")}</p>
          <Link href="/jobs" className="text-gold-600 hover:underline">
            {t("backToJobs")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/jobs/${app.jobId}`}
              className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 hover:border-gold-300"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {app.job?.title || "Job"}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {STATUS_LABELS[app.status]}
                </span>
              </div>
              {app.job?.company && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {app.job.company} · {app.job.location}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
