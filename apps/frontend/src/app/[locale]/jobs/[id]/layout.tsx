import type { Metadata } from "next";
import { cache } from "react";
import { languageAlternates, getSiteUrl } from "@/lib/site";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

type Job = {
  id: string;
  title?: string;
  company?: string;
  location?: string | null;
  description?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  employmentType?: string | null;
  createdAt?: string;
};

// cache() dedupes the fetch between generateMetadata and the layout render.
const getJob = cache(async (id: string): Promise<Job | null> => {
  try {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Job;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return { title: "Job" };
  const description = job.description?.slice(0, 160);
  return {
    title: job.title || "Job",
    description,
    alternates: {
      canonical: `/jobs/${id}`,
      languages: languageAlternates(`/jobs/${id}`),
    },
    openGraph: {
      title: job.title || "Job",
      description,
      type: "website",
    },
  };
}

export default async function JobLayout({ children, params }: Props) {
  const { id } = await params;
  const job = await getJob(id);

  const jsonLd =
    job && job.title
      ? {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: job.description || undefined,
          datePosted: job.createdAt,
          employmentType: job.employmentType || undefined,
          hiringOrganization: {
            "@type": "Organization",
            name: job.company || "Champey",
          },
          jobLocation: job.location
            ? {
                "@type": "Place",
                address: { "@type": "PostalAddress", addressLocality: job.location },
              }
            : undefined,
          url: `${getSiteUrl()}/jobs/${job.id}`,
        }
      : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  );
}
