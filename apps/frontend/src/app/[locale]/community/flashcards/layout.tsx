import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flashcards",
  description:
    "Create flashcard decks and study with spaced repetition (SM-2 algorithm).",
  alternates: { canonical: "/community/flashcards" },
};

export default function FlashcardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
