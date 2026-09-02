import type { Metadata } from "next";

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
  return children;
}
