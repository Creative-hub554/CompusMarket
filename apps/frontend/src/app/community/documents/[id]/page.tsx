"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

interface DocumentData {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const authedFetch = useAuthedFetch();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;
  const saveRef = useRef<() => Promise<void>>(null!);
  const loadedRef = useRef(false);

  useEffect(() => {
    authedFetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setDoc(data);
        setTitle(data.title);
        const c = data.content === "{}" ? "" : data.content;
        setContent(c);
        updateCounts(c);
        setLoading(false);
      })
      .catch((err) => { console.error("Failed to load document:", err); setLoading(false); });
  }, [id, authedFetch]);

  function updateCounts(html: string) {
    const text = html.replace(/<[^>]+>/g, "").trim();
    setCharCount(text.length);
    setWordCount(text ? text.split(/\s+/).length : 0);
  }

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await authedFetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: contentRef.current }),
      });
      setLastSaved(new Date());
      setDirty(false);
    } catch (err) { console.error("Failed to save:", err); }
    setSaving(false);
  }, [id, title, authedFetch]);

  saveRef.current = save;

  useEffect(() => {
    if (!loadedRef.current) return;
    setDirty(true);
    updateCounts(content);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveRef.current(), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [content, title]);

  useEffect(() => { if (doc) loadedRef.current = true; }, [doc]);

  async function deleteDocument() {
    if (!confirm("Delete this document permanently?")) return;
    try {
      await authedFetch(`/api/documents/${id}`, { method: "DELETE" });
      router.push("/community/documents");
    } catch (err) { console.error("Failed to delete:", err); }
  }

  async function exportHtml() {
    const blob = new Blob([content || "<p></p>"], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  if (loading) return <div className="text-center py-16 text-slate-400">Loading...</div>;
  if (!doc) return (
    <div className="text-center py-16">
      <p className="text-slate-400 mb-3">Document not found</p>
      <Link href="/community/documents" className="btn-primary">Back to Documents</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <Link href="/community/documents" className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Back to documents">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 text-2xl font-bold border-none outline-none bg-transparent min-w-[200px]"
          placeholder="Untitled Document"
        />
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className={`status-dot ${statusClass()}`} />
          {statusText()}
        </span>
        <button onClick={exportHtml} className="btn-ghost flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export HTML
        </button>
        <button onClick={save} disabled={saving || !dirty} className="btn-primary text-sm px-4 py-1.5">
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={deleteDocument} className="btn-danger">Delete</button>
      </div>
      <div className="flex gap-4 text-xs text-slate-400 mb-4 flex-wrap">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
          {wordCount} words
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          {charCount} chars
        </span>
        {doc.createdAt && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Created {new Date(doc.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <TipTapEditor content={content} onChange={(html) => setContent(html)} />
    </div>
  );
}
