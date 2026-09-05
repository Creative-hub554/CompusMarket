import type { Metadata } from "next";
import { SectionShell } from "@/components/SectionShell";

export const metadata: Metadata = {
  title: "Feed",
  description:
    "See posts, stories, and updates from the Champey community.",
  alternates: { canonical: "/feed" },
};

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SectionShell section="community">{children}</SectionShell>;
}
