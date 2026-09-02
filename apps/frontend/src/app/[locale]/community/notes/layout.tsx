import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Notes",
  description:
    "Write and organize study notes with Markdown and AI generation.",
  alternates: { canonical: "/community/notes" },
};

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
