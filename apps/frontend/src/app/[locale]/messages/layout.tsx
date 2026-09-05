import { SectionShell } from "@/components/SectionShell";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <SectionShell section="community">{children}</SectionShell>;
}
