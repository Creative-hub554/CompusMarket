import { SectionShell } from "@/components/SectionShell";

export default function SellerOrdersLayout({ children }: { children: React.ReactNode }) {
  return <SectionShell section="market">{children}</SectionShell>;
}
