"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

type Question = {
  id: string;
  type: string;
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
  order: number;
};

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  public: boolean;
  timeLimit: number | null;
  questions?: Question[];
  createdAt: string;
  updatedAt: string;
}

interface AttemptData {
  id: string;
  score: number;
  startedAt: string;
  completedAt: string | null;
  user?: { name: string; email: string };
}

interface ResultData {
  score: number;
  answers: {
    id: string;
    questionId: string;
    answer: string;
    isCorrect: boolean;
  }[];
}

export default function QuizDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const authedFetch = useAuthedFetch();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "take" | "result">("view");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [qType, setQType] = useState("MULTIPLE_CHOICE");
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState("");
  const [qAnswer, setQAnswer] = useState("");
  const [attempts, setAttempts] = useState<AttemptData[]>([]);
  const [showAttempts, setShowAttempts] = useState(false);

  const loadQuiz = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/quizzes/${id}`);
      const data = await res.json();
      setQuiz(data);
      setQuestions(data.questions || []);
      setNewTitle(data.title);
      setNewDesc(data.description || "");
      setIsPublic(data.public || false);
    } catch (err) {
      console.error("Failed to load quiz:", err);
    }
    setLoading(false);
  }, [id, authedFetch]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  async function updateQuiz() {
    try {
      await authedFetch(`/api/quizzes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          public: isPublic,
        }),
      });
      setEditingTitle(false);
      loadQuiz();
    } catch (err) {
      console.error("Failed to update quiz:", err);
    }
  }

  async function deleteQuiz() {
    if (!confirm("Delete this quiz permanently?")) return;
    try {
      await authedFetch(`/api/quizzes/${id}`, { method: "DELETE" });
      router.push("/community/quizzes");
    } catch (err) {
      console.error("Failed to delete quiz:", err);
    }
  }

  async function addQuestion() {
    if (!qText.trim() || !qAnswer.trim()) return;
    const options =
      qType === "MULTIPLE_CHOICE"
        ? qOptions
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    try {
      await authedFetch(`/api/quizzes/${id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: qType,
          question: qText,
          options,
          correctAnswer: qAnswer,
          points: 1,
          order: questions.length,
        }),
      });
      setQText("");
      setQOptions("");
      setQAnswer("");
      setShowAddQuestion(false);
      loadQuiz();
    } catch (err) {
      console.error("Failed to add question:", err);
    }
  }

  async function deleteQuestion(qId: string) {
    try {
      await authedFetch(`/api/quizzes/questions/${qId}`, { method: "DELETE" });
      loadQuiz();
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  }

  async function loadAttempts() {
    try {
      const res = await authedFetch(`/api/quizzes/${id}/attempts`);
      setAttempts(await res.json());
      setShowAttempts(!showAttempts);
    } catch (err) {
      console.error("Failed to load attempts:", err);
    }
  }

  async function startQuiz() {
    try {
      const res = await authedFetch(`/api/quizzes/${id}/attempts`, {
        method: "POST",
      });
      const attempt = await res.json();
      setAttemptId(attempt.id);
      setMode("take");
    } catch (err) {
      console.error("Failed to start quiz:", err);
    }
  }

  async function submitAnswer(questionId: string) {
    if (!attemptId || !answers[questionId]) return;
    try {
      await authedFetch(`/api/quizzes/attempts/${attemptId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer: answers[questionId] }),
      });
    } catch (err) {
      console.error("Failed to submit answer:", err);
    }
  }

  async function finishQuiz() {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      for (const q of questions) {
        if (answers[q.id]) await submitAnswer(q.id);
      }
      const res = await authedFetch(
        `/api/quizzes/attempts/${attemptId}/complete`,
        { method: "POST" },
      );
      const data = await res.json();
      setResult(data);
      setMode("result");
    } catch (err) {
      console.error("Failed to finish quiz:", err);
    }
    setSubmitting(false);
  }

  const questionTypes = [
    { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
    { value: "TRUE_FALSE", label: "True / False" },
    { value: "SHORT_ANSWER", label: "Short Answer" },
  ];

  if (loading)
    return (
      <div className="max-w-3xl mx-auto text-center py-16 text-slate-400">
        Loading...
      </div>
    );
  if (!quiz)
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-slate-400 mb-3">Quiz not found</p>
        <Link href="/community/quizzes" className="btn-primary">
          Back
        </Link>
      </div>
    );

  if (mode === "take") {
    const answered = Object.keys(answers).length;
    const progress =
      questions.length > 0 ? (answered / questions.length) * 100 : 0;
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{quiz.title}</h1>
          <button
            onClick={finishQuiz}
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? "Submitting..." : "Finish Quiz"}
          </button>
        </div>
        <div className="progress-bar mb-6">
          <div
            className="progress-fill bg-indigo-600"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mb-6 text-right">
          {answered} of {questions.length} answered
        </p>
        <div className="space-y-5">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`border rounded-xl p-5 transition ${answers[q.id] ? "border-indigo-600/20 bg-indigo-50/30" : "border-slate-200"}`}
            >
              <p className="font-medium mb-3 text-slate-900">
                {i + 1}. {q.question}{" "}
                <span className="text-xs text-slate-400 font-normal">
                  ({q.points} pt)
                </span>
              </p>
              {q.type === "TRUE_FALSE" ? (
                <div className="flex gap-3">
                  {["True", "False"].map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border-2 transition ${answers[q.id] === opt ? "border-indigo-600 bg-indigo-50 text-indigo-600 font-medium" : "border-slate-200 hover:border-slate-300"}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() =>
                          setAnswers((a) => ({ ...a, [q.id]: opt }))
                        }
                        className="sr-only"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : q.type === "SHORT_ANSWER" ? (
                <input
                  value={answers[q.id] || ""}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                  }
                  placeholder="Type your answer..."
                  className="input-field"
                />
              ) : (
                <div className="space-y-2">
                  {(q.options || []).map((opt: string) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition ${answers[q.id] === opt ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[q.id] === opt ? "border-indigo-600" : "border-slate-300"}`}
                      >
                        {answers[q.id] === opt && (
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() =>
                          setAnswers((a) => ({ ...a, [q.id]: opt }))
                        }
                        className="sr-only"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === "result" && result) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
            <span className="text-3xl font-bold">
              {Math.round(result.score)}%
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-1">{quiz?.title} — Results</h1>
          <p className="text-slate-500">
            {result.answers.filter((a: any) => a.isCorrect).length} /{" "}
            {questions.length} correct
          </p>
        </div>
        <div className="space-y-4">
          {result.answers?.map((answer: any) => {
            const q = questions.find((qq) => qq.id === answer.questionId);
            if (!q) return null;
            return (
              <div
                key={answer.id}
                className={`rounded-xl border p-5 ${answer.isCorrect ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${answer.isCorrect ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                  >
                    {answer.isCorrect ? (
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{q.question}</p>
                    <p className="text-sm mt-1">
                      Your answer:{" "}
                      <span className="font-medium">{answer.answer}</span>
                    </p>
                    {!answer.isCorrect && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        Correct answer:{" "}
                        <span className="font-medium text-green-600">
                          {q.correctAnswer}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setMode("view");
              setAnswers({});
              setAttemptId(null);
            }}
            className="btn-primary"
          >
            Back to Quiz
          </button>
          <Link href="/community/quizzes" className="btn-ghost">
            All Quizzes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Link
            href="/community/quizzes"
            className="text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1 text-sm"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </Link>
          {editingTitle ? (
            <div className="mt-2 space-y-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="input-field text-xl font-bold"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description"
                className="input-field"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Public (anyone can take this quiz)
              </label>
              <div className="flex gap-2">
                <button onClick={updateQuiz} className="btn-success">
                  Save
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mt-1">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-slate-500 mt-1">{quiz.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  {questions.length} questions
                </span>
                {quiz.timeLimit != null && quiz.timeLimit > 0 && (
                  <span>{quiz.timeLimit} min limit</span>
                )}
                {quiz.public ? (
                  <span className="badge bg-green-100 text-green-700">
                    Public
                  </span>
                ) : (
                  <span className="badge bg-slate-100 text-slate-600">
                    Private
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 ml-4 flex-wrap shrink-0">
          {!editingTitle && (
            <button onClick={() => setEditingTitle(true)} className="btn-ghost">
              Edit Info
            </button>
          )}
          <button
            onClick={startQuiz}
            disabled={questions.length === 0}
            className="btn-primary"
          >
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
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
              </svg>
              Start Quiz
            </span>
          </button>
          <button onClick={deleteQuiz} className="btn-danger">
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Questions</h2>
          <div className="flex gap-2">
            <button
              onClick={loadAttempts}
              className="btn-ghost flex items-center gap-1"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              {showAttempts ? "Hide" : "Attempts"}
            </button>
            <button
              onClick={() => setShowAddQuestion(!showAddQuestion)}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {showAddQuestion ? "Cancel" : "+ Add Question"}
            </button>
          </div>
        </div>

        {showAttempts && (
          <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50 animate-slide-down">
            <h3 className="text-sm font-semibold text-slate-700">
              Attempt History
            </h3>
            {attempts.length === 0 ? (
              <p className="text-xs text-slate-400">No attempts yet.</p>
            ) : (
              attempts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm border-b border-slate-200 pb-2 last:border-0"
                >
                  <span className="text-slate-600">
                    {a.user?.name || a.user?.email}
                  </span>
                  <span className="font-medium">
                    {a.completedAt ? (
                      `${Math.round(a.score)}%`
                    ) : (
                      <span className="text-amber-600">In progress</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(a.startedAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {showAddQuestion && (
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-3 animate-slide-down">
            <h3 className="section-title">New Question</h3>
            <select
              value={qType}
              onChange={(e) => setQType(e.target.value)}
              className="input-field"
            >
              {questionTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Question text"
              className="input-field"
            />
            {qType === "MULTIPLE_CHOICE" && (
              <textarea
                value={qOptions}
                onChange={(e) => setQOptions(e.target.value)}
                placeholder="Options (one per line)"
                className="input-field"
                rows={3}
              />
            )}
            <input
              value={qAnswer}
              onChange={(e) => setQAnswer(e.target.value)}
              placeholder="Correct answer"
              className="input-field"
            />
            <button
              onClick={addQuestion}
              disabled={!qText.trim() || !qAnswer.trim()}
              className="btn-success"
            >
              Add Question
            </button>
          </div>
        )}

        <div className="space-y-3">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="group border border-slate-200 rounded-xl p-5 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {i + 1}. {q.question}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="badge bg-slate-100 text-slate-600 capitalize">
                      {q.type.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="text-xs text-slate-400">
                      {q.points} pt
                    </span>
                    <span className="text-xs text-slate-400">
                      Answer:{" "}
                      <span className="font-medium text-slate-600">
                        {q.correctAnswer}
                      </span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="opacity-60 hover:opacity-100 transition btn-danger text-xs px-2 py-0.5 ml-2"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {questions.length === 0 && !showAddQuestion && (
            <div className="text-center py-10 text-slate-400">
              <p>
                No questions yet. Click &quot;+ Add Question&quot; to add one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
