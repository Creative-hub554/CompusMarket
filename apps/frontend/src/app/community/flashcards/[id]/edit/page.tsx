"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

interface CardItem {
  id: string;
  front: string;
  back: string;
  createdAt: string;
}

export default function EditDeckPage() {
  const { id } = useParams();
  const authedFetch = useAuthedFetch();
  const [deck, setDeck] = useState<{ id: string; title: string; description: string | null } | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);

  const loadDeck = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/flashcards/decks/${id}`);
      const data = await res.json();
      setDeck(data);
      setCards(data.cards || []);
    } catch (err) { console.error("Failed to load deck:", err); }
    setLoading(false);
  }, [id, authedFetch]);

  useEffect(() => { loadDeck(); }, [loadDeck]);

  async function addCard() {
    if (!front.trim() || !back.trim()) return;
    try {
      await authedFetch(`/api/flashcards/decks/${id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front, back }),
      });
      setFront("");
      setBack("");
      loadDeck();
    } catch (err) { console.error("Failed to add card:", err); }
  }

  async function deleteCard(cardId: string) {
    if (!confirm("Delete this card?")) return;
    try {
      await authedFetch(`/api/flashcards/cards/${cardId}`, { method: "DELETE" });
      loadDeck();
    } catch (err) { console.error("Failed to delete card:", err); }
  }

  async function importBulk() {
    const lines = bulk.trim().split("\n").filter(Boolean);
    try {
      for (const line of lines) {
        const [f, ...rest] = line.split("\t");
        const b = rest.join("\t");
        if (f && b) {
          await authedFetch(`/api/flashcards/decks/${id}/cards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ front: f.trim(), back: b.trim() }),
          });
        }
      }
      setBulk("");
      setShowBulk(false);
      loadDeck();
    } catch (err) { console.error("Failed to import cards:", err); }
  }

  if (loading) return <div className="max-w-2xl mx-auto text-center py-16 text-gray-400">Loading...</div>;
  if (!deck) return <div className="max-w-2xl mx-auto text-center py-16"><p className="text-gray-400">Deck not found</p></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/community/flashcards" className="text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </Link>
          <h1 className="text-xl font-bold mt-1 font-['Playfair_Display']">{deck.title}</h1>
          <p className="text-sm text-gray-500">{cards.length} card{cards.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(!showBulk)} className="btn-ghost">
            {showBulk ? "Simple Add" : "Bulk Import"}
          </button>
          <Link href={`/community/flashcards/${id}`} className="btn-primary">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Study
            </span>
          </Link>
        </div>
      </div>

      {showBulk ? (
        <div className="mb-6 p-5 border rounded-xl bg-gray-50 space-y-3">
          <h2 className="section-title">Bulk Import</h2>
          <p className="text-xs text-gray-500">Paste one card per line. Separate front and back with a <kbd className="px-1 py-0.5 bg-white rounded text-xs font-mono border">Tab</kbd> key.</p>
          <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={`Example:\nWhat is 2+2?\t4\nCapital of France?\tParis`} className="input-field font-mono text-sm" rows={5} />
          <button onClick={importBulk} disabled={!bulk.trim()} className="btn-success">Import Cards</button>
        </div>
      ) : (
        <div className="mb-6 p-5 border rounded-xl bg-gray-50 space-y-3">
          <h2 className="section-title">Add Card</h2>
          <input value={front} onChange={(e) => setFront(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addCard()} placeholder="Front (question)" className="input-field" />
          <input value={back} onChange={(e) => setBack(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addCard()} placeholder="Back (answer)" className="input-field" />
          <button onClick={addCard} disabled={!front.trim() || !back.trim()} className="btn-success">Add Card</button>
        </div>
      )}

      <div className="space-y-2">
        {cards.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No cards yet. Add your first card above.</p>
        ) : (
          cards.map((card, i) => (
            <div key={card.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition group">
              <span className="text-xs text-gray-400 font-mono mt-1 w-6 shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{card.front}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{card.back}</p>
              </div>
              <button onClick={() => deleteCard(card.id)} className="btn-danger text-xs px-2 py-0.5 opacity-60 hover:opacity-100 transition shrink-0">Delete</button>
            </div>
          ))
        )}
      </div>

      {cards.length > 0 && (
        <div className="mt-4 text-xs text-gray-400">
          Total: {cards.length} card{cards.length !== 1 ? "s" : ""}
          {deck.description && <span> — {deck.description}</span>}
        </div>
      )}
    </div>
  );
}
