"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MermaidPreview } from "@/components/editor/MermaidPreview";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

const diagramTypes = [
  { value: "flowchart", label: "Flowchart" },
  { value: "sequence", label: "Sequence" },
  { value: "class", label: "Class" },
  { value: "state", label: "State" },
  { value: "er", label: "ER" },
  { value: "gantt", label: "Gantt" },
  { value: "pie", label: "Pie" },
  { value: "mindmap", label: "Mindmap" },
  { value: "timeline", label: "Timeline" },
];

interface DiagramData {
  id: string;
  title: string;
  code: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export default function DiagramEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const authedFetch = useAuthedFetch();
  const [diagram, setDiagram] = useState<DiagramData | null>(null);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("flowchart");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRef = useRef(code);
  codeRef.current = code;
  const saveRef = useRef(save);
  saveRef.current = save;
  const loadedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    authedFetch(`/api/diagrams/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setDiagram(data);
        setTitle(data.title);
        setCode(data.code);
        setType(data.type);
        setLoading(false);
      })
      .catch((err) => { console.error("Failed to load diagram:", err); setLoading(false); });
  }, [id, authedFetch]);

  async function save() {
    setSaving(true);
    try {
      await authedFetch(`/api/diagrams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, code: codeRef.current, type }),
      });
      setLastSaved(new Date());
      setDirty(false);
    } catch (err) { console.error("Failed to save:", err); }
    setSaving(false);
  }

  useEffect(() => {
    if (!loadedRef.current) return;
    setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveRef.current(), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [code, title, type]);

  useEffect(() => { if (diagram) loadedRef.current = true; }, [diagram]);

  async function deleteDiagram() {
    if (!confirm("Delete this diagram?")) return;
    try {
      await authedFetch(`/api/diagrams/${id}`, { method: "DELETE" });
      router.push("/community/diagrams");
    } catch (err) { console.error("Failed to delete:", err); }
  }

  function statusText() {
    if (saving) return "Saving...";
    if (dirty) return "Unsaved";
    if (lastSaved) return `Saved ${lastSaved.toLocaleTimeString()}`;
    return "Saved";
  }

  function statusClass() {
    if (saving) return "saving";
    if (dirty) return "unsaved";
    return "saved";
  }

  const lineCount = code.split("\n").length;

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;
  if (!diagram) return (
    <div className="text-center py-16">
      <p className="text-gray-400 mb-3">Diagram not found</p>
      <Link href="/community/diagrams" className="btn-primary">Back</Link>
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <Link href="/community/diagrams" className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Back to diagrams">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 text-2xl font-bold border-none outline-none bg-transparent min-w-[200px] font-['Playfair_Display']" placeholder="Untitled Diagram" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field w-auto min-w-[130px]">
          {diagramTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`status-dot ${statusClass()}`} />
          {statusText()}
        </span>
        <button onClick={() => setShowHelp(!showHelp)} className="btn-ghost flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {showHelp ? "Hide Help" : "Syntax Help"}
        </button>
        <button onClick={save} disabled={saving || !dirty} className="btn-primary text-sm px-4 py-1.5">
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={deleteDiagram} className="btn-danger">Delete</button>
      </div>

      {showHelp && (
        <div className="mb-5 p-5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900 animate-slide-down">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-semibold">Mermaid Syntax Quick Reference</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="font-medium text-xs uppercase tracking-wider text-blue-700">Flowchart</p>
              <code className="block text-xs bg-white/60 rounded p-2">graph TD;<br/>A--&gt;B;</code>
              <code className="block text-xs bg-white/60 rounded p-2">A[Square]<br/>B{'{'}Rhombus{'}'}</code>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-xs uppercase tracking-wider text-blue-700">Sequence</p>
              <code className="block text-xs bg-white/60 rounded p-2">Alice-&gt;&gt;John: Hello</code>
              <code className="block text-xs bg-white/60 rounded p-2">Note right of John: Text</code>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-xs uppercase tracking-wider text-blue-700">General</p>
              <code className="block text-xs bg-white/60 rounded p-2">%% Comments</code>
              <code className="block text-xs bg-white/60 rounded p-2">subgraph Title<br/>...<br/>end</code>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Diagram Code</label>
            <span className="text-xs text-gray-400">{lineCount} lines</span>
          </div>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-50 border-r border-gray-200 rounded-l-xl flex flex-col items-end pr-2 pt-3 text-xs text-gray-400 font-mono select-none overflow-hidden pointer-events-none">
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                <span key={i} className="leading-6">{i + 1}</span>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-mono h-[550px] resize-none focus:outline-none focus:ring-2 focus:ring-khmer-blue/30 focus:border-khmer-blue transition pl-14 leading-6"
              placeholder="Enter Mermaid diagram code..."
              spellCheck={false}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Preview</label>
          </div>
          <MermaidPreview code={code} />
        </div>
      </div>
    </div>
  );
}
