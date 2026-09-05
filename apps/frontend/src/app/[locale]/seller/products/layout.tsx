import { SectionShell } from "@/components/SectionShell";

export default function SellerProductsLayout({ children }: { children: React.ReactNode }) {
  return <SectionShell section="market">{children}</SectionShell>;
}
