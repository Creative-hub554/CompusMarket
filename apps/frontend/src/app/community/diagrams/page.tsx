"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

const diagramTypes = [
  { value: "flowchart", label: "Flowchart", color: "badge bg-blue-100 text-blue-700" },
  { value: "sequence", label: "Sequence", color: "badge bg-green-100 text-green-700" },
  { value: "class", label: "Class", color: "badge bg-purple-100 text-purple-700" },
  { value: "state", label: "State", color: "badge bg-orange-100 text-orange-700" },
  { value: "er", label: "ER", color: "badge bg-pink-100 text-pink-700" },
  { value: "gantt", label: "Gantt", color: "badge bg-teal-100 text-teal-700" },
  { value: "pie", label: "Pie", color: "badge bg-yellow-100 text-yellow-700" },
  { value: "mindmap", label: "Mindmap", color: "badge bg-indigo-100 text-indigo-700" },
  { value: "timeline", label: "Timeline", color: "badge bg-rose-100 text-rose-700" },
];

function getTypeStyle(type: string) {
  return diagramTypes.find((t) => t.value === type)?.color || "badge bg-gray-100 text-gray-700";
}

function getTemplate(type: string): string {
  const templates: Record<string, string> = {
    flowchart: "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[End]\n  B -->|No| D[Retry]",
    sequence: "sequenceDiagram\n  participant User\n  participant App\n  User->>App: Request\n  App-->>User: Response",
    class: "classDiagram\n  class Animal {\n    +name: string\n    +move(): void\n  }\n  class Dog extends Animal {\n    +bark(): void\n  }",
    state: "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Active: Start\n  Active --> Idle: Stop\n  Active --> [*]",
    er: "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains",
    gantt: "gantt\n  title Project Plan\n  dateFormat YYYY-MM-DD\n  section Phase 1\n  Task 1 :a1, 2024-01-01, 30d\n  Task 2 :after a1, 20d",
    pie: 'pie title Distribution\n  "Category A" : 40\n  "Category B" : 30\n  "Category C" : 20\n  "Other" : 10',
    mindmap: "mindmap\n  root((Project))\n    Frontend\n      React\n      TypeScript\n    Backend\n      NestJS\n      Prisma\n    Database\n      SQLite",
    timeline: "timeline\n  title Company History\n  2018 : Founded\n  2020 : Series A\n  2022 : IPO\n  2024 : Global Expansion",
  };
  return templates[type] || templates.flowchart;
}

interface DiagramItem {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export default function DiagramsPage() {
  const { data: session } = useSession();
  const authedFetch = useAuthedFetch();
  const [diagrams, setDiagrams] = useState<DiagramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("flowchart");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadDiagrams() {
    setLoading(true);
    try {
      const res = await authedFetch("/api/diagrams");
      setDiagrams(await res.json());
    } catch (err) { console.error("Failed to load diagrams:", err); }
    setLoading(false);
  }

  useEffect(() => { loadDiagrams(); }, []);

  async function createDiagram() {
    if (!newTitle.trim()) return;
    const res = await authedFetch("/api/diagrams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, type: newType, code: getTemplate(newType) }),
    });
    const diagram = await res.json();
    window.location.href = `/community/diagrams/${diagram.id}`;
  }

  async function deleteDiagram(id: string) {
    if (!confirm("Delete this diagram?")) return;
    setDeleting(id);
    try {
      await authedFetch(`/api/diagrams/${id}`, { method: "DELETE" });
      setDiagrams((prev) => prev.filter((d) => d.id !== id));
    } catch (err) { console.error("Failed to delete:", err); }
    setDeleting(null);
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Diagrams</h1>
        <p className="text-gray-500 mb-4">Sign in to create diagrams flowcharts and mind maps.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Diagrams</h1>
          <p className="page-subtitle">Flowcharts, mind maps, sequence diagrams and more (powered by Mermaid).</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Diagram
          </span>
        </button>
      </div>

      {showNew && (
        <div className="mb-6 p-5 border rounded-xl bg-gray-50 flex gap-2 flex-wrap items-start">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createDiagram()}
            placeholder="Diagram title..."
            className="input-field flex-1 min-w-[200px]"
            autoFocus
          />
          <select value={newType} onChange={(e) => setNewType(e.target.value)} className="input-field w-auto min-w-[140px]">
            {diagramTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={createDiagram} className="btn-success">Create</button>
          <button onClick={() => { setShowNew(false); setNewTitle(""); }} className="btn-ghost">Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : diagrams.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
          </div>
          <p className="text-xl font-medium text-gray-500 mb-1">No diagrams yet</p>
          <p className="text-sm text-gray-400">Click &quot;+ New Diagram&quot; to create your first flowchart or mind map.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {diagrams.map((d) => (
            <div key={d.id} className="card relative group">
              <Link href={`/community/diagrams/${d.id}`} className="block p-5">
                <h3 className="font-semibold truncate text-gray-900 group-hover:text-khmer-blue transition-colors">{d.title}</h3>
                <span className={`${getTypeStyle(d.type)} mt-2`}>{d.type}</span>
                <p className="text-xs text-gray-400 mt-4">{new Date(d.updatedAt).toLocaleDateString()}</p>
              </Link>
              <button
                onClick={() => deleteDiagram(d.id)}
                disabled={deleting === d.id}
                className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition btn-danger text-xs px-2 py-0.5"
              >
                {deleting === d.id ? "..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
