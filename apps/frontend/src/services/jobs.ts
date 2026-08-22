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

const API = "/api/jobs";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const jobsApi = {
  list: (params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    return fetchJson<Job[]>(`/?${qs.toString()}`);
  },
  byId: (id: string) => fetchJson<Job>(`/${id}`),
  create: (data: Record<string, unknown>) =>
    fetchJson<Job>("", { method: "POST", body: JSON.stringify(data) }),
  apply: (id: string, data: Record<string, unknown>) =>
    fetchJson(`/${id}/apply`, { method: "POST", body: JSON.stringify(data) }),
  myApplications: () => fetchJson<JobApplication[]>("/my-applications"),
  applicants: (id: string) => fetchJson<JobApplication[]>(`/${id}/applicants`),
};
