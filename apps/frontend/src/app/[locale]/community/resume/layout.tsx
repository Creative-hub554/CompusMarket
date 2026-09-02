import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Builder",
  description:
    "Build professional resumes with multiple templates, AI suggestions, and PDF export.",
  alternates: { canonical: "/community/resume" },
};

export default function ResumeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
