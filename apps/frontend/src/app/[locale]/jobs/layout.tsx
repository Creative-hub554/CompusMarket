import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "Find career opportunities from the community, post jobs, and set alerts.",
  alternates: { canonical: "/jobs" },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
