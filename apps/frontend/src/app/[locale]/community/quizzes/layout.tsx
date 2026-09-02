import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quizzes",
  description:
    "Create and take quizzes to test your knowledge, with AI generation.",
  alternates: { canonical: "/community/quizzes" },
};

export default function QuizzesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
