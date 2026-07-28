"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface DocumentItem {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadDocs() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      setDocuments(await res.json());
    } catch (err) { console.error("Failed to load documents:", err); }
    setLoading(false);
  }

  useEffect(() => { loadDocs(); }, []);

  async function createDocument() {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    const doc = await res.json();
    window.location.href = `/community/documents/${doc.id}`;
  }

  async function deleteDocument(id: string) {
    if (!confirm("Delete this document permanently?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) { console.error("Failed to delete:", err); }
    setDeleting(null);
  }

  function stripHtml(html: string): string {
    if (!html || html === "{}") return "";
    return html.replace(/<[^>]+>/g, "").substring(0, 120);
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Documents</h1>
        <p className="text-gray-500 mb-4">Sign in to create and edit rich text documents.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Create and edit rich text documents.</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Document
          </span>
        </button>
      </div>

      {showNew && (
        <div className="mb-6 p-5 border rounded-xl bg-gray-50 flex gap-2 items-start">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createDocument()}
            placeholder="Document title..."
            className="input-field flex-1"
            autoFocus
          />
          <button onClick={createDocument} className="btn-success">Create</button>
          <button onClick={() => { setShowNew(false); setNewTitle(""); }} className="btn-ghost">Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <p className="text-xl font-medium text-gray-500 mb-1">No documents yet</p>
          <p className="text-sm text-gray-400">Click &quot;+ New Document&quot; to create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {documents.map((doc) => {
            const preview = stripHtml(doc.content);
            return (
              <div key={doc.id} className="card relative group">
                <Link href={`/community/documents/${doc.id}`} className="block p-5">
                  <h3 className="font-semibold truncate text-gray-900 group-hover:text-khmer-blue transition-colors">{doc.title}</h3>
                  {preview && <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{preview}</p>}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-400">{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    {doc.folder && <span className="tag">{doc.folder.name}</span>}
                  </div>
                </Link>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  disabled={deleting === doc.id}
                  className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition btn-danger text-xs px-2 py-0.5"
                >
                  {deleting === doc.id ? "..." : "Delete"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
