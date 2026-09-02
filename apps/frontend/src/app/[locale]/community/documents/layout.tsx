import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
  description:
    "Create and edit rich text documents with a full-featured editor.",
  alternates: { canonical: "/community/documents" },
};

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
