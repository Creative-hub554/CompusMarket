"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

interface FlashcardDeckItem {
  id: string;
  title: string;
  description: string | null;
  _count?: { cards: number };
  createdAt: string;
  updatedAt: string;
}

export default function FlashcardsPage() {
  const { data: session } = useSession();
  const authedFetch = useAuthedFetch();
  const [decks, setDecks] = useState<FlashcardDeckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadDecks() {
    setLoading(true);
    try {
      const res = await authedFetch("/api/flashcards/decks");
      setDecks(await res.json());
    } catch (err) { console.error("Failed to load decks:", err); }
    setLoading(false);
  }

  useEffect(() => { loadDecks(); }, [loadDecks]);

  async function createDeck() {
    if (!newTitle.trim()) return;
    await authedFetch("/api/flashcards/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDesc }),
    });
    setShowNew(false);
    setNewTitle("");
    setNewDesc("");
    loadDecks();
  }

  async function deleteDeck(id: string) {
    if (!confirm("Delete this deck and all its cards?")) return;
    setDeleting(id);
    try {
      await authedFetch(`/api/flashcards/decks/${id}`, { method: "DELETE" });
      setDecks((prev) => prev.filter((d) => d.id !== id));
    } catch (err) { console.error("Failed to delete:", err); }
    setDeleting(null);
  }

  const filtered = decks.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.description || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!session) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Flashcards</h1>
        <p className="text-slate-500 mb-4">Sign in to create flashcard decks and study with spaced repetition.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Flashcards</h1>
          <p className="page-subtitle">Create decks and study with spaced repetition (SM-2).</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Deck
          </span>
        </button>
      </div>

      <div className="mb-5 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search decks..."
          className="input-field pl-10"
        />
      </div>

      {showNew && (
        <div className="mb-6 p-5 border rounded-xl bg-slate-50 space-y-3">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Deck title..." className="input-field" autoFocus />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)..." className="input-field" />
          <div className="flex gap-2">
            <button onClick={createDeck} className="btn-success">Create</button>
            <button onClick={() => setShowNew(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse"><div className="h-5 bg-slate-200 rounded w-2/3 mb-3" /><div className="h-3 bg-slate-200 rounded w-1/3" /></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <p className="text-xl font-medium text-slate-500 mb-1">{search ? "No decks match your search" : "No flashcard decks yet"}</p>
          <p className="text-sm text-slate-400">{search ? "Try a different search term." : 'Click "+ New Deck" to get started.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {filtered.map((deck) => (
            <div key={deck.id} className="card relative group">
              <Link href={`/community/flashcards/${deck.id}`} className="block p-5">
                <h3 className="font-semibold truncate text-slate-900 group-hover:text-gold-600 transition-colors">{deck.title}</h3>
                {deck.description && <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{deck.description}</p>}
                <div className="flex items-center gap-3 mt-4 text-xs text-slate-400">
                  <span className="font-medium">{deck._count?.cards ?? 0} cards</span>
                </div>
              </Link>
              <div className="px-5 pb-4">
                <Link href={`/community/flashcards/${deck.id}/edit`} className="text-xs text-gold-600 hover:text-gold-700 font-medium">Edit Cards</Link>
              </div>
              <button
                onClick={() => deleteDeck(deck.id)}
                disabled={deleting === deck.id}
                className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition btn-danger text-xs px-2 py-0.5"
              >
                {deleting === deck.id ? "..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
