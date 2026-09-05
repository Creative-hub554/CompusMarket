import { SectionShell } from "@/components/SectionShell";

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <SectionShell section="market">{children}</SectionShell>;
}
