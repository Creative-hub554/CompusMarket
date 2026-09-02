import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design Assets",
  description:
    "1,000+ free Cambodia-themed PNGs, color palettes, and design resources for your projects.",
  alternates: { canonical: "/community/design" },
};

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
