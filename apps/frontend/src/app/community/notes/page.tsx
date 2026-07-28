"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/notes${params}`)
      .then((r) => r.json())
      .then(setNotes)
      .catch((err) => { console.error("Failed to load notes:", err); })
      .finally(() => setLoading(false));
  }, [search]);

  async function createNote() {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    const note = await res.json();
    window.location.href = `/community/notes/${note.id}`;
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note permanently?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) { console.error("Failed to delete:", err); }
    setDeleting(null);
  }

  function getWordCount(md: string): number {
    if (!md) return 0;
    return md.trim().split(/\s+/).filter(Boolean).length;
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Study Notes</h1>
        <p className="text-gray-500 mb-4">Sign in to write and organize study notes with Markdown.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Study Notes</h1>
          <p className="page-subtitle">Write and organize your study notes with Markdown.</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Note
          </span>
        </button>
      </div>

      <div className="mb-5 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes by title or content..." className="input-field pl-10" />
      </div>

      {showNew && (
        <div className="mb-6 p-5 border rounded-xl bg-gray-50 flex gap-2 items-start">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createNote()} placeholder="Note title..." className="input-field flex-1" autoFocus />
          <button onClick={createNote} className="btn-success">Create</button>
          <button onClick={() => { setShowNew(false); setNewTitle(""); }} className="btn-ghost">Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
          </div>
          <p className="text-xl font-medium text-gray-500 mb-1">{search ? "No notes match your search" : "No notes yet"}</p>
          <p className="text-sm text-gray-400">{search ? "Try a different search term." : 'Click "+ New Note" to create your first one.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {notes.map((note) => {
            const tags: string[] = note.tags || [];
            const words = getWordCount(note.content);
            const preview = note.content?.replace(/[#*`\[\]]/g, "").substring(0, 150) || "";
            return (
              <div key={note.id} className="card relative group">
                <Link href={`/community/notes/${note.id}`} className="block p-5">
                  <h3 className="font-semibold truncate text-gray-900 group-hover:text-khmer-blue transition-colors">{note.title}</h3>
                  {preview && <p className="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed">{preview}</p>}
                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-400 flex-wrap">
                    {tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                    {words > 0 && <span>{words} words</span>}
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Link>
                <button
                  onClick={() => deleteNote(note.id)}
                  disabled={deleting === note.id}
                  className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition btn-danger text-xs px-2 py-0.5"
                >
                  {deleting === note.id ? "..." : "Delete"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
