"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

interface NoteData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function NoteEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const authedFetch = useAuthedFetch();
  const [note, setNote] = useState<NoteData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [preview, setPreview] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;
  const saveRef = useRef<() => Promise<void>>(null!);
  const loadedRef = useRef(false);

  useEffect(() => {
    authedFetch(`/api/notes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setNote(data);
        setTitle(data.title);
        setContent(data.content || "");
        setTagsInput((data.tags || []).join(", "));
        setLoading(false);
      })
      .catch((err) => { console.error("Failed to load note:", err); setLoading(false); });
  }, [id, authedFetch]);

  const save = useCallback(async () => {
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      await authedFetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: contentRef.current, tags }),
      });
      setLastSaved(new Date());
      setDirty(false);
    } catch (err) { console.error("Failed to save:", err); }
    setSaving(false);
  }, [id, title, tagsInput, authedFetch]);

  saveRef.current = save;

  useEffect(() => {
    if (!loadedRef.current) return;
    setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveRef.current(), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [content, title, tagsInput]);

  useEffect(() => { if (note) loadedRef.current = true; }, [note]);

  async function deleteNote() {
    if (!confirm("Delete this note permanently?")) return;
    try {
      await authedFetch(`/api/notes/${id}`, { method: "DELETE" });
      router.push("/community/notes");
    } catch (err) { console.error("Failed to delete:", err); }
  }

  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = content.length;

  function statusText() {
    if (saving) return "Saving...";
    if (dirty) return "Unsaved changes";
    if (lastSaved) return `Saved ${lastSaved.toLocaleTimeString()}`;
    return "All changes saved";
  }

  function statusClass() {
    if (saving) return "saving";
    if (dirty) return "unsaved";
    return "saved";
  }

  const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

  if (loading) return <div className="max-w-4xl mx-auto text-center py-16 text-gray-400">Loading...</div>;
  if (!note) return (
    <div className="max-w-4xl mx-auto text-center py-16">
      <p className="text-gray-400 mb-3">Note not found</p>
      <Link href="/community/notes" className="btn-primary">Back to Notes</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <Link href="/community/notes" className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Back to notes">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 text-2xl font-bold border-none outline-none bg-transparent min-w-[200px] font-['Playfair_Display']"
          placeholder="Untitled Note"
        />
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`status-dot ${statusClass()}`} />
          {statusText()}
        </span>
        <div className="flex gap-1">
          <button onClick={() => { setSplitView(false); setPreview(false); }} className={`btn-ghost text-xs px-2 py-1 ${!preview && !splitView ? "bg-gray-100 border-gray-300" : ""}`} title="Edit" aria-label="Edit mode">✏ Edit</button>
          <button onClick={() => { setSplitView(true); setPreview(true); }} className={`btn-ghost text-xs px-2 py-1 ${splitView ? "bg-gray-100 border-gray-300" : ""}`} title="Split View" aria-label="Split view">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
          </button>
          <button onClick={() => { setSplitView(false); setPreview(true); }} className={`btn-ghost text-xs px-2 py-1 ${preview && !splitView ? "bg-gray-100 border-gray-300" : ""}`} title="Preview" aria-label="Preview mode">👁 Preview</button>
        </div>
        <button onClick={save} disabled={saving || !dirty} className="btn-primary text-sm px-4 py-1.5">
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={deleteNote} className="btn-danger">Delete</button>
      </div>

      <div className="flex gap-4 text-xs text-gray-400 mb-3 flex-wrap items-center">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
          {wordCount} words
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          {charCount} chars
        </span>
        {note.createdAt && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {new Date(note.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>

      <input
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags: comma, separated"
        className="input-field mb-5"
      />

      {splitView ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Markdown</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-mono h-[600px] resize-none focus:outline-none focus:ring-2 focus:ring-khmer-blue/30 focus:border-khmer-blue transition leading-relaxed"
              placeholder="Write your note in Markdown..."
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</p>
            <div className="prose prose-sm max-w-none p-6 border border-gray-200 rounded-xl min-h-[600px] bg-white overflow-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Nothing to preview*"}</ReactMarkdown>
            </div>
          </div>
        </div>
      ) : preview ? (
        <div className="prose prose-sm max-w-none p-8 border border-gray-200 rounded-xl min-h-[500px] bg-white">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Nothing to preview*"}</ReactMarkdown>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Markdown</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-mono h-[550px] resize-none focus:outline-none focus:ring-2 focus:ring-khmer-blue/30 focus:border-khmer-blue transition leading-relaxed"
            placeholder="Write your note in Markdown... Use **bold**, *italic*, # headings, - lists, etc."
          />
        </div>
      )}
    </div>
  );
}
