"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

const articleCategories = [
  "CAREER_GUIDE",
  "INTERVIEW_TIPS",
  "RESUME_EXAMPLES",
  "JOB_SEARCH",
  "COMPUTER_LITERACY",
  "WORKPLACE_COMMUNICATION",
  "PRODUCTIVITY",
];

export default function NewArticlePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    category: "CAREER_GUIDE",
    tags: "",
  });
  const [showAi, setShowAi] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLang, setAiLang] = useState<"km" | "en">("km");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  function handleSlug(title: string) {
    setForm((prev) => ({
      ...prev,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    }));
  }

  async function generateArticle() {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-article",
          data: { topic: aiTopic.trim(), category: form.category, language: aiLang },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.result?.content) throw new Error(json.error || "Generation failed");
      const article = json.result;
      setForm((prev) => ({
        ...prev,
        title: article.title,
        slug: article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        excerpt: article.excerpt,
        content: article.content,
        tags: Array.isArray(article.tags) ? article.tags.join(", ") : "",
      }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate article.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.articles.create({
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    router.push("/admin/articles");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Article</h1>
      <button
        type="button"
        onClick={() => setShowAi(!showAi)}
        className="mb-4 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
      >
        ✨ Generate with AI
      </button>
      {showAi && (
        <div className="mb-6 p-5 border border-indigo-200 rounded-xl bg-indigo-50">
          <h2 className="text-sm font-semibold text-indigo-800 mb-3">✨ AI Generate Article</h2>
          <div className="flex gap-2 items-start">
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateArticle()}
              placeholder="Topic, e.g. How to prepare for a job interview..."
              className="flex-1 rounded border px-3 py-2 text-sm"
              disabled={aiLoading}
            />
            <select
              value={aiLang}
              onChange={(e) => setAiLang(e.target.value as "km" | "en")}
              className="rounded border px-2 py-2 text-sm bg-white"
              disabled={aiLoading}
            >
              <option value="km">ខ្មែរ</option>
              <option value="en">English</option>
            </select>
            <button
              type="button"
              onClick={generateArticle}
              disabled={aiLoading || !aiTopic.trim()}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {aiLoading ? "Generating..." : "Generate"}
            </button>
          </div>
          <p className="text-xs text-indigo-600 mt-2">
            Fills the form below using the selected category. Review before creating.
          </p>
          {aiError && <p className="text-sm text-red-600 mt-2">{aiError}</p>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleSlug(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {articleCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Excerpt</label>
          <input
            type="text"
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            rows={16}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700"
        >
          Create Article
        </button>
      </form>
    </div>
  );
}
