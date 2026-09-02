import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagrams",
  description:
    "Create flowcharts, mind maps, sequence diagrams and more with Mermaid.",
  alternates: { canonical: "/community/diagrams" },
};

export default function DiagramsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
