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

  function handleSlug(title: string) {
    setForm((prev) => ({
      ...prev,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    }));
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
