import { SectionShell } from "@/components/SectionShell";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <SectionShell section="market">{children}</SectionShell>;
}
