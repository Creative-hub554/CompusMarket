import { SectionShell } from "@/components/SectionShell";

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <SectionShell section="market">{children}</SectionShell>;
}
