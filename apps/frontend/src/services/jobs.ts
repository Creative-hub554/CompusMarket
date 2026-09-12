export type JobType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERNSHIP"
  | "REMOTE";
export type JobStatus = "OPEN" | "CLOSED";
export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: JobType;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  status: JobStatus;
  postedById: string;
  createdAt: string;
  postedBy?: { id: string; name: string | null; image: string | null };
};

export type JobApplication = {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter: string | null;
  resumeId: string | null;
  status: ApplicationStatus;
  createdAt: string;
  applicant?: { id: string; name: string | null; image: string | null };
  job?: Job;
};

import { apiFetch } from "@/lib/apiFetch";

const API = "/api/jobs";

export const jobsApi = {
  list: (params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    return apiFetch<Job[]>(`${API}?${qs.toString()}`);
  },
  byId: (id: string) => apiFetch<Job>(`${API}/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<Job>(API, { method: "POST", body: data }),
  apply: (id: string, data: Record<string, unknown>) =>
    apiFetch(`${API}/${id}/apply`, { method: "POST", body: data }),
  myApplications: () => apiFetch<JobApplication[]>(`${API}/my-applications`),
  applicants: (id: string) => apiFetch<JobApplication[]>(`${API}/${id}/applicants`),
};
