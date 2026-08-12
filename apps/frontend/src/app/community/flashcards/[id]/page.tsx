"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

interface CardData {
  id: string;
  front: string;
  back: string;
}

export default function StudyPage() {
  const { id } = useParams();
  const authedFetch = useAuthedFetch();
  const [deck, setDeck] = useState<{ id: string; title: string } | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    authedFetch(`/api/flashcards/decks/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setDeck(data);
        setCards(data.cards || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load deck:", err);
        setLoading(false);
      });
  }, [id, authedFetch]);

  const review = useCallback(
    async (quality: number) => {
      const card = cards[currentIndex];
      if (!card || reviewing) return;
      setReviewing(true);
      try {
        await authedFetch(`/api/flashcards/cards/${card.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quality }),
        });
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setFlipped(false);
        } else {
          setCompleted(true);
        }
      } catch (err) {
        console.error("Failed to submit review:", err);
      }
      setReviewing(false);
    },
    [cards, currentIndex, reviewing, authedFetch],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!flipped && e.code === "Space") {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if (flipped) {
        const keyMap: Record<string, number> = {
          "1": 1,
          "2": 3,
          "3": 4,
          "4": 5,
        };
        if (keyMap[e.key] !== undefined) {
          review(keyMap[e.key]);
        }
      }
    },
    [flipped, review],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (loading)
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-slate-400">
        Loading...
      </div>
    );
  if (!deck)
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-slate-400 mb-3">Deck not found</p>
        <Link href="/community/flashcards" className="btn-primary">
          Back
        </Link>
      </div>
    );
  if (cards.length === 0)
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-400">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-slate-500 mb-3">No cards in this deck</p>
        <Link href={`/community/flashcards/${id}/edit`} className="btn-primary">
          Add Cards
        </Link>
      </div>
    );

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
        <p className="text-slate-500 mb-6">
          You reviewed all {cards.length} cards.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setCompleted(false);
              setFlipped(false);
            }}
            className="btn-primary"
          >
            Study Again
          </button>
          <Link href={`/community/flashcards/${id}/edit`} className="btn-ghost">
            Edit Cards
          </Link>
          <Link href="/community/flashcards" className="btn-ghost">
            All Decks
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];
  const progress = (currentIndex / cards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/community/flashcards"
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Back to flashcards"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Link>
        <span className="text-sm font-medium text-slate-500">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <div className="progress-bar mb-6">
        <div
          className="progress-fill bg-indigo-600"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h1 className="text-xl font-bold mb-6">{deck.title}</h1>

      <div className="flip-card" style={{ minHeight: 320 }}>
        <div
          onClick={() => !flipped && setFlipped(true)}
          className={`flip-card-inner relative w-full ${flipped ? "flipped" : ""}`}
          style={{ minHeight: 320 }}
        >
          <div className="flip-card-front cursor-pointer rounded-xl border-2 border-slate-200 p-10 flex items-center justify-center text-center hover:shadow-lg transition select-none bg-white min-h-[320px]">
            <div>
              <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">
                Question — Click or press Space
              </p>
              <p className="text-xl whitespace-pre-wrap leading-relaxed font-medium text-slate-900">
                {card.front}
              </p>
            </div>
          </div>
          <div className="flip-card-back cursor-default rounded-xl border-2 border-indigo-600/20 p-10 flex items-center justify-center text-center bg-gradient-to-br from-indigo-50 to-indigo-50/50 min-h-[320px]">
            <div>
              <p className="text-xs text-indigo-600 mb-4 uppercase tracking-wider font-semibold">
                Answer
              </p>
              <p className="text-lg whitespace-pre-wrap leading-relaxed text-slate-800">
                {card.back}
              </p>
            </div>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="mt-8 animate-fade-in">
          <p className="text-sm text-slate-500 mb-4 text-center font-medium">
            How well did you know this?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => review(1)}
              className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 transition border border-red-200 hover:border-red-300"
            >
              <span className="block">Again</span>
              <span className="text-xs opacity-60">1 — No recall</span>
            </button>
            <button
              onClick={() => review(3)}
              className="rounded-xl bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition border border-yellow-200 hover:border-yellow-300"
            >
              <span className="block">Hard</span>
              <span className="text-xs opacity-60">2 — With effort</span>
            </button>
            <button
              onClick={() => review(4)}
              className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200 hover:border-indigo-300"
            >
              <span className="block">Good</span>
              <span className="text-xs opacity-60">3 — Correct</span>
            </button>
            <button
              onClick={() => review(5)}
              className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100 transition border border-green-200 hover:border-green-300"
            >
              <span className="block">Easy</span>
              <span className="text-xs opacity-60">4 — Instant</span>
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">
            Or press{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono border">
              Space
            </kbd>{" "}
            to flip,{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono border">
              1
            </kbd>
            -
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono border">
              4
            </kbd>{" "}
            to rate
          </p>
        </div>
      )}
    </div>
  );
}
