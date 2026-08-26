"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

interface QuizItem {
  id: string;
  title: string;
  description: string | null;
  public: boolean;
  timeLimit: number | null;
  _count?: { questions: number; attempts: number };
  createdAt: string;
  updatedAt: string;
}

export default function QuizzesPage() {
  const { data: session } = useSession();
  const authedFetch = useAuthedFetch();
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiLang, setAiLang] = useState<"km" | "en">("km");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function loadQuizzes() {
    setLoading(true);
    try {
      const res = await authedFetch("/api/quizzes");
      setQuizzes(await res.json());
    } catch (err) {
      console.error("Failed to load quizzes:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  async function createQuiz() {
    if (!newTitle.trim()) return;
    const res = await authedFetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    const quiz = await res.json();
    window.location.href = `/community/quizzes/${quiz.id}`;
  }

  async function deleteQuiz(id: string) {
    if (!confirm("Delete this quiz and all its data?")) return;
    setDeleting(id);
    try {
      await authedFetch(`/api/quizzes/${id}`, { method: "DELETE" });
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
    setDeleting(null);
  }

  async function generateQuiz() {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await authedFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-quiz",
          data: {
            topic: aiTopic.trim(),
            numberOfQuestions: aiCount,
            language: aiLang,
          },
        }),
      });
      const json = await res.json();
      if (
        !res.ok ||
        !json.result?.title ||
        !Array.isArray(json.result.questions)
      ) {
        throw new Error(json.error || "Generation failed");
      }
      const quiz = json.result;
      const quizRes = await authedFetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quiz.title,
          description: quiz.description || "",
        }),
      });
      const created = await quizRes.json();
      for (const q of quiz.questions) {
        await authedFetch(`/api/quizzes/${created.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        });
      }
      window.location.href = `/community/quizzes/${created.id}`;
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Failed to generate quiz.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  const filtered = quizzes.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (!session) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Quizzes</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          Sign in to create and take quizzes.
        </p>
        <Link href="/login" className="btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Quizzes</h1>
          <p className="page-subtitle">
            Create and take quizzes to test your knowledge.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAi(!showAi)}
            className="rounded-lg border border-gold-300 bg-gold-50 dark:bg-gold-950/40 px-3 py-2 text-sm font-medium text-gold-700 hover:bg-gold-100 transition"
          >
            ✨ AI Generate
          </button>
          <button onClick={() => setShowNew(!showNew)} className="btn-primary">
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Quiz
            </span>
          </button>
        </div>
      </div>

      {showAi && (
        <div className="mb-6 p-5 border border-gold-200 rounded-xl bg-gold-50 dark:bg-gold-950/40">
          <h2 className="text-sm font-semibold text-gold-800 mb-3">
            ✨ AI Generate Quiz
          </h2>
          <div className="flex gap-2 items-start">
            <input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateQuiz()}
              placeholder="Topic, e.g. JavaScript basics, Geography, Biology..."
              className="input-field flex-1"
              disabled={aiLoading}
            />
            <input
              type="number"
              value={aiCount}
              min={3}
              max={10}
              onChange={(e) => setAiCount(Number(e.target.value))}
              className="w-20 rounded border px-2 py-2 text-sm bg-[var(--surface)]"
              disabled={aiLoading}
              title="Number of questions (3-10)"
            />
            <select
              value={aiLang}
              onChange={(e) => setAiLang(e.target.value as "km" | "en")}
              className="rounded border px-2 py-2 text-sm bg-[var(--surface)]"
              disabled={aiLoading}
            >
              <option value="km">ខ្មែរ</option>
              <option value="en">English</option>
            </select>
            <button
              onClick={generateQuiz}
              disabled={aiLoading || !aiTopic.trim()}
              className="btn-success whitespace-nowrap"
            >
              {aiLoading ? "Generating..." : "Generate"}
            </button>
          </div>
          {aiError && <p className="text-sm text-red-600 mt-2">{aiError}</p>}
        </div>
      )}

      <div className="mb-5 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quizzes..."
          className="input-field pl-10"
        />
      </div>

      {showNew && (
        <div className="mb-6 p-5 border rounded-xl bg-[var(--surface-2)] flex gap-2 items-start">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createQuiz()}
            placeholder="Quiz title..."
            className="input-field flex-1"
            autoFocus
          />
          <button onClick={createQuiz} className="btn-success">
            Create
          </button>
          <button
            onClick={() => {
              setShowNew(false);
              setNewTitle("");
            }}
            className="btn-ghost"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-400">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <p className="text-xl font-medium text-slate-500 dark:text-slate-400 mb-1">
            {search ? "No quizzes match your search" : "No quizzes yet"}
          </p>
          <p className="text-sm text-slate-400">
            {search
              ? "Try a different search term."
              : 'Click "+ New Quiz" to create your first one.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {filtered.map((quiz) => (
            <div key={quiz.id} className="card relative group">
              <Link
                href={`/community/quizzes/${quiz.id}`}
                className="block p-5"
              >
                <h3 className="font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-gold-600 transition-colors">
                  {quiz.title}
                </h3>
                {quiz.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {quiz.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-4 text-xs text-slate-400">
                  <span>{quiz._count?.questions ?? 0} questions</span>
                  <span>{quiz._count?.attempts ?? 0} attempts</span>
                  {quiz.public && (
                    <span className="badge bg-green-100 text-green-700">
                      Public
                    </span>
                  )}
                </div>
              </Link>
              <button
                onClick={() => deleteQuiz(quiz.id)}
                disabled={deleting === quiz.id}
                className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition btn-danger text-xs px-2 py-0.5"
              >
                {deleting === quiz.id ? "..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
