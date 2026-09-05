import type { Metadata } from "next";
import { SectionShell } from "@/components/SectionShell";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Search, buy, and sell second-hand electronics in the Khmer community.",
  alternates: { canonical: "/market" },
};

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SectionShell section="market">{children}</SectionShell>;
}
