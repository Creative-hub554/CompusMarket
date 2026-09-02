import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Groups",
  description:
    "Join or create community groups, share posts, and connect with others.",
  alternates: { canonical: "/community/groups" },
};

export default function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
